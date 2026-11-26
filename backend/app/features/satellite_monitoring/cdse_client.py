# backend/app/features/satellite_monitoring/cdse_client.py
"""
Real Sentinel-2 L2A Satellite Data Provider & COG Windowed Processor.
- Primary Authenticated Mode (when CDSE_CLIENT_ID / SENTINEL_HUB_CLIENT_ID are set):
  Copernicus Data Space Ecosystem OAuth2 token acquisition & Sentinel Hub API support.
- Open Access Copernicus Sentinel-2 L2A Mode (default, zero paid credentials needed):
  Queries Element84 Earth Search v1 STAC API (`sentinel-2-l2a` COGs), reads windowed
  10m/20m GeoTIFF bands clipped to the exact farm polygon, masks clouds/shadows using
  the official Scene Classification Layer (SCL), computes genuine NDVI/NDMI/EVI statistics,
  and renders True-Color RGB, False-Color NIR-R-G, and NDVI heatmap PNG overlays.
"""
import base64
import hashlib
import io
import json
import math
import os
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import rasterio
import requests
from PIL import Image, ImageDraw
from pyproj import Transformer
from rasterio.windows import from_bounds
from shapely.geometry import Polygon, mapping
from shapely.ops import transform as shapely_transform

EARTH_SEARCH_STAC_URL = "https://earth-search.aws.element84.com/v1/search"
CDSE_TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
CDSE_PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/process"
CDSE_STATISTICAL_URL = "https://sh.dataspace.copernicus.eu/api/v1/statistics"

# Official Sentinel-2 L2A Scene Classification Layer (SCL) invalid/cloud classes:
# 0: NO_DATA, 1: SATURATED_DEFECTIVE, 3: CLOUD_SHADOWS,
# 8: CLOUD_MEDIUM_PROBABILITY, 9: CLOUD_HIGH_PROBABILITY, 10: THIN_CIRRUS
SCL_INVALID_CLASSES = {0, 1, 3, 8, 9, 10}

_TOKEN_LOCK = threading.Lock()
_CACHED_CDSE_TOKEN: Optional[str] = None
_CACHED_CDSE_EXPIRY: float = 0.0


def get_cdse_credentials() -> Tuple[Optional[str], Optional[str]]:
    cid = os.getenv("CDSE_CLIENT_ID") or os.getenv("SENTINEL_HUB_CLIENT_ID")
    csec = os.getenv("CDSE_CLIENT_SECRET") or os.getenv("SENTINEL_HUB_CLIENT_SECRET")
    return cid, csec


def acquire_cdse_token() -> Optional[str]:
    """Acquire Copernicus Data Space Ecosystem OAuth2 token when credentials are configured."""
    global _CACHED_CDSE_TOKEN, _CACHED_CDSE_EXPIRY
    cid, csec = get_cdse_credentials()
    if not cid or not csec:
        return None
    now = time.time()
    if _CACHED_CDSE_TOKEN and now < _CACHED_CDSE_EXPIRY - 30:
        return _CACHED_CDSE_TOKEN
    with _TOKEN_LOCK:
        if _CACHED_CDSE_TOKEN and time.time() < _CACHED_CDSE_EXPIRY - 30:
            return _CACHED_CDSE_TOKEN
        resp = requests.post(
            CDSE_TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": cid,
                "client_secret": csec,
            },
            timeout=15,
        )
        resp.raise_for_status()
        payload = resp.json()
        _CACHED_CDSE_TOKEN = payload.get("access_token")
        _CACHED_CDSE_EXPIRY = time.time() + int(payload.get("expires_in", 600))
        return _CACHED_CDSE_TOKEN


def get_provider_status() -> Dict[str, Any]:
    cid, csec = get_cdse_credentials()
    has_oauth = bool(cid and csec)
    return {
        "cdse_oauth_configured": has_oauth,
        "cdse_token_endpoint": CDSE_TOKEN_URL,
        "open_sentinel2_stac_active": True,
        "open_stac_endpoint": EARTH_SEARCH_STAC_URL,
        "collection": "sentinel-2-l2a",
        "spatial_resolution_m": {"rgb_nir": 10, "swir_scl": 20},
        "revisit_note": "Sentinel-2 constellation has a nominal 5-day revisit interval; usable observations depend on cloud cover.",
        "setup_instructions": (
            "Optional: Set CDSE_CLIENT_ID and CDSE_CLIENT_SECRET in backend .env to enable authenticated Copernicus Sentinel Hub Process/Statistical APIs. "
            "Without paid credentials, RaithaMitra retrieves open Sentinel-2 Level-2A GeoTIFF COGs directly."
        ),
    }


def _polygon_to_bbox_and_geom(coords: List[List[float]]) -> Tuple[List[float], Polygon, str]:
    """Ensure closed [lon, lat] ring, compute parcel bbox + padded display bbox, and hash."""
    ring = [(float(p[0]), float(p[1])) for p in coords]
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    poly = Polygon(ring)
    minx, miny, maxx, maxy = poly.bounds
    # Pad display window (~250m buffer around parcel) so small 1-5 acre farms have spatial context
    pad_lon = max(0.0022, (maxx - minx) * 0.65)
    pad_lat = max(0.0022, (maxy - miny) * 0.65)
    view_bbox = [minx - pad_lon, miny - pad_lat, maxx + pad_lon, maxy + pad_lat]
    poly_hash = hashlib.sha256(json.dumps(ring).encode()).hexdigest()[:16]
    return view_bbox, poly, poly_hash


def _array_to_png_data_url(
    rgb_uint8: np.ndarray,
    poly_pixel_pts: List[Tuple[float, float]],
    outline_color: Tuple[int, int, int] = (250, 204, 21),
) -> str:
    img = Image.fromarray(rgb_uint8, mode="RGB").resize((360, 360), Image.Resampling.BILINEAR)
    scale_x = 360.0 / max(1, rgb_uint8.shape[1])
    scale_y = 360.0 / max(1, rgb_uint8.shape[0])
    scaled_pts = [(x * scale_x, y * scale_y) for x, y in poly_pixel_pts]
    if len(scaled_pts) >= 3:
        draw = ImageDraw.Draw(img)
        draw.line(scaled_pts + [scaled_pts[0]], fill=outline_color, width=3)
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"


def _build_ndvi_colormap(ndvi: np.ndarray, valid_mask: np.ndarray) -> np.ndarray:
    """Map NDVI [-0.2, 0.85] -> soil-brown -> straw -> chartreuse -> deep forest green; clouds slate."""
    norm = np.clip((ndvi + 0.1) / 0.95, 0.0, 1.0)
    r = np.zeros_like(norm, dtype=np.uint8)
    g = np.zeros_like(norm, dtype=np.uint8)
    b = np.zeros_like(norm, dtype=np.uint8)

    # Smooth piecewise agricultural colormap
    low = norm < 0.35
    mid = (norm >= 0.35) & (norm < 0.65)
    high = norm >= 0.65

    t_low = norm / 0.35
    r[low] = (145 + t_low[low] * 70).astype(np.uint8)
    g[low] = (100 + t_low[low] * 85).astype(np.uint8)
    b[low] = (68 + t_low[low] * 20).astype(np.uint8)

    t_mid = (norm - 0.35) / 0.30
    r[mid] = (215 - t_mid[mid] * 145).astype(np.uint8)
    g[mid] = (185 + t_mid[mid] * 25).astype(np.uint8)
    b[mid] = (88 - t_mid[mid] * 30).astype(np.uint8)

    t_high = (norm - 0.65) / 0.35
    r[high] = (70 - t_high[high] * 55).astype(np.uint8)
    g[high] = (210 - t_high[high] * 75).astype(np.uint8)
    b[high] = (58 - t_high[high] * 18).astype(np.uint8)

    rgb = np.stack([r, g, b], axis=-1)
    # Mark cloud / shadow / nodata pixels clearly in neutral gray-blue
    rgb[~valid_mask] = [148, 163, 184]
    return rgb


def search_sentinel2_scenes(
    coords: List[List[float]],
    start_iso: str,
    end_iso: str,
    max_cloud_pct: float = 85.0,
    limit: int = 12,
) -> Tuple[List[Dict[str, Any]], List[float], Polygon, str]:
    view_bbox, poly, poly_hash = _polygon_to_bbox_and_geom(coords)
    minx, miny, maxx, maxy = poly.bounds
    search_bbox = [minx, miny, maxx, maxy]

    resp = requests.post(
        EARTH_SEARCH_STAC_URL,
        json={
            "collections": ["sentinel-2-l2a"],
            "bbox": search_bbox,
            "datetime": f"{start_iso}/{end_iso}",
            "limit": limit,
        },
        timeout=20,
    )
    resp.raise_for_status()
    feats = resp.json().get("features", [])
    # Sort chronologically oldest -> newest for time-lapse
    filtered = [
        f
        for f in feats
        if (f.get("properties", {}).get("eo:cloud_cover") or 0.0) <= max_cloud_pct
        and "red" in f.get("assets", {})
        and "nir" in f.get("assets", {})
        and "scl" in f.get("assets", {})
    ]
    filtered.sort(key=lambda f: f.get("properties", {}).get("datetime", ""))
    return filtered, view_bbox, poly, poly_hash


def process_sentinel2_scene(
    feature: Dict[str, Any],
    view_bbox: List[float],
    parcel_poly: Polygon,
) -> Dict[str, Any]:
    """
    Read windowed B02/B03/B04/B08 (10m) and B11/SCL (20m) COGs, apply parcel polygon clipping
    and SCL cloud/shadow masking, compute exact NDVI/NDMI/EVI, and render 3 PNG layers.
    """
    assets = feature["assets"]
    props = feature.get("properties", {})
    scene_id = feature["id"]
    acq_dt = props.get("datetime")
    scene_cloud_pct = round(float(props.get("eo:cloud_cover") or 0.0), 2)

    from concurrent.futures import ThreadPoolExecutor

    def read_window(band_key: str, target_shape: Optional[Tuple[int, int]] = None) -> Tuple[np.ndarray, Any, Any]:
        url = assets[band_key]["href"]
        with rasterio.Env(
            GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
            CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
            VSI_CACHE="TRUE",
            GDAL_HTTP_TIMEOUT="15",
        ):
            with rasterio.open(url) as src:
                tr = Transformer.from_crs("EPSG:4326", src.crs, always_xy=True)
                wx0, wy0 = tr.transform(view_bbox[0], view_bbox[1])
                wx1, wy1 = tr.transform(view_bbox[2], view_bbox[3])
                win = from_bounds(wx0, wy0, wx1, wy1, src.transform)
                if target_shape is not None:
                    arr = src.read(
                        1,
                        window=win,
                        out_shape=target_shape,
                        resampling=rasterio.enums.Resampling.nearest,
                    )
                else:
                    arr = src.read(1, window=win)
                win_transform = src.window_transform(win)
                return arr, src.crs, win_transform

    red_raw, crs, win_transform = read_window("red")
    H, W = red_raw.shape
    with ThreadPoolExecutor(max_workers=5) as pool:
        f_nir = pool.submit(read_window, "nir", (H, W))
        f_grn = pool.submit(read_window, "green", (H, W))
        f_blu = pool.submit(read_window, "blue", (H, W))
        f_swr = pool.submit(read_window, "swir16", (H, W))
        f_scl = pool.submit(read_window, "scl", (H, W))
        nir_raw, _, _ = f_nir.result()
        green_raw, _, _ = f_grn.result()
        blue_raw, _, _ = f_blu.result()
        swir_raw, _, _ = f_swr.result()
        scl_raw, _, _ = f_scl.result()

    # Project farm polygon to image pixel coordinates
    tr = Transformer.from_crs("EPSG:4326", crs, always_xy=True)
    poly_utm = shapely_transform(lambda x, y, z=None: tr.transform(x, y), parcel_poly)
    inv_tr = ~win_transform
    poly_px_pts = [inv_tr * (x, y) for x, y in poly_utm.exterior.coords]

    # Rasterize exact parcel mask using Pillow ImageDraw
    mask_img = Image.new("L", (W, H), 0)
    if len(poly_px_pts) >= 3:
        ImageDraw.Draw(mask_img).polygon(poly_px_pts, outline=1, fill=1)
    parcel_mask = np.asarray(mask_img, dtype=bool)
    if not parcel_mask.any():
        # Sub-pixel / tiny parcel fallback: use central 3x3 window inside parcel bounds
        cy, cx = H // 2, W // 2
        parcel_mask[max(0, cy - 1) : min(H, cy + 2), max(0, cx - 1) : min(W, cx + 2)] = True

    # SCL cloud / cloud-shadow / nodata mask
    invalid_scl = np.isin(scl_raw, list(SCL_INVALID_CLASSES))
    nonzero_mask = (red_raw > 0) & (nir_raw > 0)
    valid_scene_mask = (~invalid_scl) & nonzero_mask
    parcel_valid_mask = parcel_mask & valid_scene_mask

    total_parcel_px = int(parcel_mask.sum())
    valid_parcel_px = int(parcel_valid_mask.sum())
    valid_pixel_pct = round((valid_parcel_px / max(1, total_parcel_px)) * 100.0, 1)
    parcel_cloud_pct = round(100.0 - valid_pixel_pct, 1)

    # Convert DN to surface reflectance [0..1] (Sentinel-2 L2A Collection-1 offset: check Earth Search scale)
    # Note: Earth Search L2A C1 uses DN/10000 reflectance (no -1000 BOA offset in older scenes, and clipped >=0 safely)
    b04 = np.clip(red_raw.astype(np.float32) / 10000.0, 0.0, 1.0)
    b03 = np.clip(green_raw.astype(np.float32) / 10000.0, 0.0, 1.0)
    b02 = np.clip(blue_raw.astype(np.float32) / 10000.0, 0.0, 1.0)
    b08 = np.clip(nir_raw.astype(np.float32) / 10000.0, 0.0, 1.0)
    b11 = np.clip(swir_raw.astype(np.float32) / 10000.0, 0.0, 1.0)

    ndvi_map = (b08 - b04) / np.where((b08 + b04) == 0, 1e-6, (b08 + b04))
    ndmi_map = (b08 - b11) / np.where((b08 + b11) == 0, 1e-6, (b08 + b11))
    evi_denom = b08 + 6.0 * b04 - 7.5 * b02 + 1.0
    evi_map = 2.5 * (b08 - b04) / np.where(np.abs(evi_denom) < 1e-4, 1.0, evi_denom)

    usable = valid_pixel_pct >= 40.0
    if usable and valid_parcel_px > 0:
        ndvi_vals = ndvi_map[parcel_valid_mask]
        ndmi_vals = ndmi_map[parcel_valid_mask]
        evi_vals = np.clip(evi_map[parcel_valid_mask], -1.0, 1.0)
        stats = {
            "ndvi_mean": round(float(np.mean(ndvi_vals)), 4),
            "ndvi_min": round(float(np.min(ndvi_vals)), 4),
            "ndvi_max": round(float(np.max(ndvi_vals)), 4),
            "ndmi_mean": round(float(np.mean(ndmi_vals)), 4),
            "evi_mean": round(float(np.mean(evi_vals)), 4),
        }
    else:
        stats = {"ndvi_mean": None, "ndvi_min": None, "ndvi_max": None, "ndmi_mean": None, "evi_mean": None}

    # Build RGB, False-Color (NIR, Red, Green), and NDVI Heatmap images
    rgb_true = np.clip(np.stack([b04, b03, b02], axis=-1) * 3.0 * 255.0, 0, 255).astype(np.uint8)
    rgb_false = np.clip(np.stack([b08, b04, b03], axis=-1) * 2.5 * 255.0, 0, 255).astype(np.uint8)
    rgb_ndvi = _build_ndvi_colormap(ndvi_map, valid_scene_mask)

    return {
        "scene_id": scene_id,
        "provider": "Copernicus Sentinel-2 L2A (Element84 Earth Search COG)",
        "acquisition_date": acq_dt,
        "resolution_m": 10,
        "scene_cloud_cover_pct": scene_cloud_pct,
        "parcel_cloud_cover_pct": parcel_cloud_pct,
        "valid_pixel_coverage_pct": valid_pixel_pct,
        "total_parcel_pixels": total_parcel_px,
        "valid_parcel_pixels": valid_parcel_px,
        "usable": usable,
        "limitation_note": None
        if usable
        else f"Rejected for index calculation: only {valid_pixel_pct}% clear pixels due to clouds/shadows (SCL mask).",
        "indices": stats,
        "layers": {
            "true_color_png": _array_to_png_data_url(rgb_true, poly_px_pts),
            "false_color_png": _array_to_png_data_url(rgb_false, poly_px_pts),
            "ndvi_png": _array_to_png_data_url(rgb_ndvi, poly_px_pts, outline_color=(255, 255, 255)),
        },
        "window_shape": [H, W],
    }
