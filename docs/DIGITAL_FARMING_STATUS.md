# Digital Farming & Geospatial Intelligence — Status

- **Branch:** `feature/digital-farming`
- **Direct Route:** `/digital-farming`
- **Status:** Implemented & TypeScript-verified (standalone Next.js module, zero shared file modifications).

## Implemented Capabilities
- Interactive Leaflet map with OpenStreetMap standard tiles + toggleable Esri World Imagery satellite layer, fullscreen mode, browser GPS, Nominatim/RaithaMitra location search, and manual lat/lon navigation.
- Manual farmland boundary drawing with draggable numbered vertices, delete vertex, undo/redo, clear/redraw, close polygon, and self-intersection + degenerate-polygon rejection.
- WGS84 spherical geodesic area calculation (`geo.ts`, matching `@turf/area`) reporting sq.m, acres, hectares, guntas, cents, Haversine perimeter, centroid, and GeoJSON `Feature` local persistence (`localStorage`).
- Digital Farm Profile, 20-crop deterministic recommendation engine, interactive SVG virtual farmland twin across 10 growth stages and 7 plant visual types, Play/Pause/Speed/Next Day/+7 Days/Next Stage/Restart/Harvest controls, 8 weather scenarios, 14-risk intelligence + harvest warning, 15-field financial calculator, 3-crop comparison with Recharts, 3-scenario What-If engine, English/Kannada/Hindi labels, Tumakuru fictional demo, and printable decision report.

## Optional Backend Integration
To expose the optional FastAPI endpoint, the integration developer can register `backend.app.services.digital_farming.geospatial_service.router` in `backend/app/api/api.py`.
