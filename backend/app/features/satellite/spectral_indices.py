"""
AD-25: Scientific Spectral Vegetation & Moisture Indices.
Implements NDVI, NDMI (NIR-SWIR), NDWI (Green-NIR), EVI, SAVI, and NDRE
with strict denominator guards and field-level statistical distribution helpers.
"""
from __future__ import annotations

from typing import Dict, List, Optional
import numpy as np


def compute_ndvi(nir: float, red: float) -> Optional[float]:
    """NDVI = (NIR - Red) / (NIR + Red) using Sentinel-2 B08 & B04."""
    denom = nir + red
    if denom == 0.0:
        return None
    return round((nir - red) / denom, 4)


def compute_ndmi(nir: float, swir: float) -> Optional[float]:
    """NDMI = (NIR - SWIR) / (NIR + SWIR) using Sentinel-2 B08 & B11 (vegetation moisture)."""
    denom = nir + swir
    if denom == 0.0:
        return None
    return round((nir - swir) / denom, 4)


def compute_ndwi(green: float, nir: float) -> Optional[float]:
    """NDWI = (Green - NIR) / (Green + NIR) using Sentinel-2 B03 & B08 (surface water)."""
    denom = green + nir
    if denom == 0.0:
        return None
    return round((green - nir) / denom, 4)


def compute_evi(nir: float, red: float, blue: float) -> Optional[float]:
    """EVI = 2.5 * (NIR - Red) / (NIR + 6 * Red - 7.5 * Blue + 1) using B08, B04, B02."""
    denom = nir + 6.0 * red - 7.5 * blue + 1.0
    if denom == 0.0:
        return None
    return round(2.5 * (nir - red) / denom, 4)


def compute_savi(nir: float, red: float, l_factor: float = 0.5) -> Optional[float]:
    """SAVI = ((NIR - Red) / (NIR + Red + L)) * (1 + L), default L=0.5."""
    denom = nir + red + l_factor
    if denom == 0.0:
        return None
    return round(((nir - red) / denom) * (1.0 + l_factor), 4)


def compute_ndre(nir: float, red_edge: float) -> Optional[float]:
    """NDRE = (NIR - RedEdge) / (NIR + RedEdge) using Sentinel-2 B08 & B05."""
    denom = nir + red_edge
    if denom == 0.0:
        return None
    return round((nir - red_edge) / denom, 4)


def compute_all_indices_from_bands(bands: Dict[str, Optional[float]]) -> Dict[str, Optional[float]]:
    nir = bands.get("nir")
    red = bands.get("red")
    blue = bands.get("blue")
    green = bands.get("green")
    swir = bands.get("swir")
    red_edge = bands.get("red_edge")

    ndvi = compute_ndvi(nir, red) if (nir is not None and red is not None) else None
    ndmi = compute_ndmi(nir, swir) if (nir is not None and swir is not None) else None
    ndwi = compute_ndwi(green, nir) if (green is not None and nir is not None) else None
    evi = compute_evi(nir, red, blue) if (nir is not None and red is not None and blue is not None) else None
    savi = compute_savi(nir, red) if (nir is not None and red is not None) else None
    ndre = compute_ndre(nir, red_edge) if (nir is not None and red_edge is not None) else None

    return {
        "ndvi": ndvi,
        "ndmi": ndmi,
        "ndwi": ndwi,
        "evi": evi,
        "savi": savi,
        "ndre": ndre,
    }


def summarize_pixel_distribution(values: List[float]) -> Optional[Dict[str, float]]:
    clean = [float(v) for v in values if v is not None and np.isfinite(v)]
    if not clean:
        return None
    arr = np.array(clean, dtype=np.float64)
    return {
        "mean": round(float(np.mean(arr)), 4),
        "median": round(float(np.median(arr)), 4),
        "min": round(float(np.min(arr)), 4),
        "max": round(float(np.max(arr)), 4),
        "std": round(float(np.std(arr)), 4),
        "p10": round(float(np.percentile(arr, 10)), 4),
        "p90": round(float(np.percentile(arr, 90)), 4),
        "valid_pixel_count": int(arr.size),
    }
