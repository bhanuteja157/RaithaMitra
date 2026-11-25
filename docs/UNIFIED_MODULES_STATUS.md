# AD-16 — Unified Agricultural Modules & Route Mapping

- **Branch:** `feature/unified-modules` (based on `638fa5a`)
- **Farmer Navigation Count:** Reduced from **29** sidebar items (across 6 groups) to **10** unified farmer-friendly items:
  1. `Home` -> `/`
  2. `BioIntel` -> `/biointel` (combines Plan My Crop, Compare Seed Varieties, Find Seeds & Nurseries, and expandable Biological & Scientific Research)
  3. `Digital Farm` -> `/digital-farming` (geospatial mapping, satellite time-lapse, simulation, plus existing `/farm-twin`, `/satellite`, `/simulation` preserved)
  4. `Farm Management` -> `/farm-management` (combines `/climate`, `/irrigation`, `/soil-nutrients`)
  5. `Crop Health` -> `/crop-health` (combines `/diagnostics`, `/surveillance`)
  6. `Labour Connect` -> `/labour` (worker discovery, job management, resources)
  7. `Smart Bidding & Market` -> `/smart-market` (combines `/bidding`, `/market-intelligence`, `/marketplace`)
  8. `Transport Connect` -> `/transport` (logistics, driver discovery, delivery tracking, post-harvest `/post-harvest`)
  9. `Finance & Benefits` -> `/finance-benefits` (combines `/finance`, `/schemes`)
  10. `Profile & Settings` -> `/profile` (with `/settings` preserved)

## Preserved Original Routes (100% Compatibility)
All original routes (`/nursery-marketplace`, `/climate`, `/irrigation`, `/soil-nutrients`, `/diagnostics`, `/surveillance`, `/bidding`, `/market-intelligence`, `/marketplace`, `/finance`, `/schemes`, `/farm-twin`, `/satellite`, `/simulation`, `/post-harvest`, `/resources`, `/decision-intelligence`, `/assistant`, `/dashboard/buyer`, `/dashboard/labour`, `/dashboard/driver`) remain intact and functional.

## Voice Assistant Navigation Targets (For AD-15 Integration)
- BioIntel & Seed Planning -> `/biointel`
- Digital Farm & Simulator -> `/digital-farming`
- Farm Management (Weather, Irrigation, Soil) -> `/farm-management`
- Crop Health & Diagnostics -> `/crop-health`
- Labour Connect -> `/labour`
- Smart Bidding & Market -> `/smart-market`
- Transport Connect -> `/transport`
- Finance & Government Benefits -> `/finance-benefits`
- Profile & Settings -> `/profile`
