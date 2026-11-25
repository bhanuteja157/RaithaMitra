"""
AD-25: Genuine Satellite Data Providers.
Supports:
  1. Sentinel Hub (OAuth2 + Token Caching + Catalog Search + Statistical API with SCL cloud masking)
     when SENTINEL_HUB_CLIENT_ID and SENTINEL_HUB_CLIENT_SECRET are configured.
  2. Element84 Earth Search Public STAC (https://earth-search.aws.element84.com/v1/search)
     for live Sentinel-2 L2A scene discovery, acquisition dates, cloud coverage, product IDs,
     and true-color thumbnail/preview URLs without paid credentials.
Never fabricates raster measurements or historical acquisitions.
"""
from __future__ import annotations

import os
import time
from typing import Any, Dict, List, Optional

import httpx

EARTH_SEARCH_STAC_URL = "https://earth-search.aws.element84.com/v1/search"
SENTINEL_HUB_TOKEN_URL = "https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token"
SENTINEL_HUB_STATS_URL = "https://services.sentinel-hub.com/api/v1/statistics"

_TOKEN_CACHE: Dict[str, Any] = {"access_token": None, "expires_at": 0.0}

SENTINEL_HUB_EVALSCRIPT = """//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02", "B03", "B04", "B05", "B08", "B11", "SCL", "dataMask"] }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "ndmi", bands: 1, sampleType: "FLOAT32" },
      { id: "ndwi", bands: 1, sampleType: "FLOAT32" },
      { id: "evi", bands: 1, sampleType: "FLOAT32" },
      { id: "savi", bands: 1, sampleType: "FLOAT32" },
      { id: "ndre", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(s) {
  // Mask no-data, cloud shadow (3), cloud medium/high (8,9), cirrus (10)
  var valid = s.dataMask === 1 && s.SCL !== 3 && s.SCL !== 8 && s.SCL !== 9 && s.SCL !== 10;
  var ndvi = (s.B08 + s.B04) !== 0 ? (s.B08 - s.B04) / (s.B08 + s.B04) : 0;
  var ndmi = (s.B08 + s.B11) !== 0 ? (s.B08 - s.B11) / (s.B08 + s.B11) : 0;
  var ndwi = (s.B03 + s.B08) !== 0 ? (s.B03 - s.B08) / (s.B03 + s.B08) : 0;
  var eviDenom = s.B08 + 6 * s.B04 - 7.5 * s.B02 + 1;
  var evi = eviDenom !== 0 ? 2.5 * (s.B08 - s.B04) / eviDenom : 0;
  var saviDenom = s.B08 + s.B04 + 0.5;
  var savi = saviDenom !== 0 ? ((s.B08 - s.B04) / saviDenom) * 1.5 : 0;
  var ndre = (s.B08 + s.B05) !== 0 ? (s.B08 - s.B05) / (s.B08 + s.B05) : 0;
  return {
    ndvi: [ndvi],
    ndmi: [ndmi],
    ndwi: [ndwi],
    evi: [evi],
    savi: [savi],
    ndre: [ndre],
    dataMask: [valid ? 1 : 0]
  };
}
"""


def sentinel_hub_configured() -> bool:
    return bool(os.getenv("SENTINEL_HUB_CLIENT_ID") and os.getenv("SENTINEL_HUB_CLIENT_SECRET"))


async def get_sentinel_hub_token() -> Optional[str]:
    if not sentinel_hub_configured():
        return None
    now = time.time()
    if _TOKEN_CACHE["access_token"] and now < _TOKEN_CACHE["expires_at"] - 30:
        return _TOKEN_CACHE["access_token"]

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            SENTINEL_HUB_TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": os.getenv("SENTINEL_HUB_CLIENT_ID", ""),
                "client_secret": os.getenv("SENTINEL_HUB_CLIENT_SECRET", ""),
            },
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        _TOKEN_CACHE["access_token"] = data.get("access_token")
        _TOKEN_CACHE["expires_at"] = now + float(data.get("expires_in", 3600))
        return _TOKEN_CACHE["access_token"]


async def fetch_sentinel_hub_statistics(
    polygon: Dict[str, Any],
    start_iso: str,
    end_iso: str,
) -> Optional[List[Dict[str, Any]]]:
    token = await get_sentinel_hub_token()
    if not token:
        return None

    payload = {
        "input": {
            "bounds": {"geometry": polygon},
            "data": [{"type": "sentinel-2-l2a", "dataFilter": {"maxCloudCoverage": 40}}],
        },
        "aggregation": {
            "timeRange": {"from": start_iso, "to": end_iso},
            "aggregationInterval": {"of": "P1D"},
            "evalscript": SENTINEL_HUB_EVALSCRIPT,
            "resx": 10,
            "resy": 10,
        },
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            SENTINEL_HUB_STATS_URL,
            headers={"Authorization": f"Bearer {token}"},
            json=payload,
        )
        if resp.status_code != 200:
            return None
        return resp.json().get("data", [])


async def search_earth_search_stac(
    polygon: Dict[str, Any],
    start_iso: str,
    end_iso: str,
    max_cloud_pct: float = 35.0,
    limit: int = 8,
) -> List[Dict[str, Any]]:
    """
    Query Element84 Earth Search STAC API for genuine Sentinel-2 L2A acquisitions.
    Returns normalized scene metadata (product_id, acquisition_timestamp, cloud_coverage_pct,
    thumbnail_url, bands_available). Never fabricates acquisitions if network fails.
    """
    body = {
        "collections": ["sentinel-2-l2a"],
        "intersects": polygon,
        "datetime": f"{start_iso}/{end_iso}",
        "limit": max(1, min(limit, 20)),
        "query": {"eo:cloud_cover": {"lte": max_cloud_pct}},
        "sortby": [{"field": "properties.datetime", "direction": "desc"}],
    }
    async with httpx.AsyncClient(timeout=12.0) as client:
        resp = await client.post(EARTH_SEARCH_STAC_URL, json=body)
        if resp.status_code != 200:
            return []
        features = resp.json().get("features", [])
        scenes: List[Dict[str, Any]] = []
        for f in features:
            props = f.get("properties", {})
            assets = f.get("assets", {})
            thumb = assets.get("thumbnail", {}).get("href") or assets.get("visual", {}).get("href")
            scenes.append(
                {
                    "product_id": f.get("id"),
                    "acquisition_timestamp": props.get("datetime"),
                    "cloud_coverage_pct": round(float(props.get("eo:cloud_cover", 0.0)), 2),
                    "platform": props.get("platform", "sentinel-2"),
                    "spatial_resolution_m": 10,
                    "thumbnail_url": thumb,
                    "assets_available": sorted(list(assets.keys())),
                    "source_url": f"https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/{f.get('id')}",
                }
            )
        return scenes
