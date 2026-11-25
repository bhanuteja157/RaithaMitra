# AD-25 — Advanced Satellite & Geospatial Agricultural Intelligence

## Overview
AD-25 replaces the previous Sentinel-2 unavailable stub in `backend/app/services/satellite_service.py` and basic `/satellite` UI with a production-ready, scientifically transparent geospatial intelligence subsystem.

## Key Capabilities Implemented
1. **GeoJSON Boundary Validation & Geodesic Area (`backend/app/features/satellite/geometry.py`)**
   - Validates GeoJSON `Polygon` and `Feature` geometries, coordinate ordering (`[lon, lat]`), closed rings, and edge self-intersections.
   - Computes geodesic area in hectares (`0.05 ha` minimum, `5000 ha` maximum), bounding box, centroid, deterministic `polygon_hash`, and spatial resolution warnings for fields `< 0.25 ha`.
2. **Multi-Spectral Index Engine (`backend/app/features/satellite/spectral_indices.py`)**
   - Implements `NDVI`, `NDMI` (`NIR/SWIR`), `NDWI` (`Green/NIR`), `EVI`, `SAVI` (`L=0.5`), and `NDRE` (`NIR/RedEdge`) with zero-denominator guards (`None` when undefined) and pixel distribution summaries.
3. **Live Satellite Providers (`backend/app/features/satellite/providers.py`)**
   - **Element84 Earth Search Public STAC (`sentinel-2-l2a`)**: Live scene discovery returning real acquisition timestamps, cloud cover percentages, product IDs, MGRS tiles, and true-color preview thumbnails.
   - **Sentinel Hub Statistical API**: OAuth2 token caching and cloud-masked (`SCL`) multi-band field statistics when `SENTINEL_HUB_CLIENT_ID` and `SENTINEL_HUB_CLIENT_SECRET` are configured.
   - Never fabricates spectral indices when only STAC metadata is available (`band_statistics_available: false`).
4. **SQLite Persistence, Offline Cache & Change Detection (`backend/app/features/satellite/service.py`)**
   - Persists real observations in `satellite_observations_cache` (demo observations are never persisted).
   - Supports offline/provider-failure cache fallback (`cache_fallback: true`) and chronological change detection (`abs_change`, `pct_change`, `direction`, neutral agronomic interpretation).
   - Enforces strict farm ownership (`403 Forbidden` for unauthorized/non-farmer access).
5. **Weather, FAO-56 Irrigation & Assistant Integration**
   - Fuses satellite indices with Open-Meteo `ET0`, crop water demand, 48h rainfall forecast, and `DecisionEngine` recommendations.
   - Provides a non-diagnostic Crop Doctor (`/crop-doctor`) inspection hint when canopy/chlorophyll stress is detected.
   - Exposes read-only `get_satellite_intelligence` tool in the AD-23 multilingual assistant.
6. **Frontend Dashboard (`frontend/src/app/satellite/page.tsx`)**
   - Sections A–F: GeoJSON validator & map, live STAC scene table & true-color quicklook, 6 spectral index cards, Recharts historical change-detection chart, weather/irrigation fusion + Crop Doctor link, and provider transparency panel.
