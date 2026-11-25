# AD-32 — RaithaMitra Unified Seed-to-Sale Journey Report

## 1. Lifecycle Architecture & Nine Stages
The Seed-to-Sale Journey (`backend/app/features/journey/`) connects all completed RaithaMitra modules into a persistent, dynamic 9-stage agricultural lifecycle:
1. **Crop & Seed Selection** (`/biointel`, `/nursery-marketplace`, `/schemes`)
2. **Land Preparation & Sowing** (`/resources`, `/soil-nutrients`, `/labour`, `/irrigation`)
3. **Crop Growth & Monitoring** (`/digital-farming`, `/satellite`, `/climate`)
4. **Crop Health & Protection** (`/crop-health`, `/surveillance`)
5. **Harvest Planning** (`/post-harvest`, `/resources`, `/labour`, `/decision-intelligence`)
6. **Post-Harvest & Storage** (`/post-harvest`) — supports `not_applicable` for direct sales
7. **Market Intelligence & Selling** (`/market-intelligence`, `/bidding`, `/smart-market`)
8. **Transportation & Delivery** (`/transport`)
9. **Income, Profit & Outcome** (`/finance`, `/finance-benefits`)

## 2. Database Schema (Non-Destructive)
Added 4 tables in `backend/app/db/database.py`:
- `crop_journeys`
- `crop_journey_stages`
- `crop_journey_activities`
- `crop_journey_module_links`

## 3. Progress, Financial Separation & Jury Demo
- **Genuine Stage Progress (`progress_engine.py`)**: Computed dynamically as `completed_stages / applicable_stages` (excluding `not_applicable`), never hardcoded and never driven by page visits.
- **Financial Separation (`module_adapters.py`)**: Reuses AD-24 `compute_financial_summary`, strictly distinguishing confirmed sales from verified received cash payments.
- **Isolated Jury Demo (`demo_service.py`)**: Dynamically runs AD-29 (`Market B` `₹44,000` vs `Market A` `₹42,000`), AD-27 (`₹48,200` vs `₹47,000`), and AD-28 (`₹6,300` vs `₹8,400`, `₹2,100` savings) under `is_demonstration = 1`.

## 4. UI, Homepage, Sidebar & Assistant Integration
- **Dedicated Workspace**: `frontend/src/app/journey/page.tsx` + `frontend/src/lib/journeyApi.ts`.
- **Homepage & Sidebar**: Added `HomepageJourneyCard` to `frontend/src/app/page.tsx` and `Seed-to-Sale Journey` (`/journey`) to `frontend/src/components/layout/Sidebar.tsx`.
- **AD-23 Assistant**: Added read-only `get_active_crop_journey` tool (`EN/KN/HI/TE`).

## 5. Verification & Limitations
- Verified via `pytest backend/tests/test_journey_ad32.py -v`, full `pytest backend/tests -v`, and `npx tsc --noEmit && npm run build`.
- **Remaining Limitations**: Live browser UI walkthrough was not executed in a live Chrome session; AD-22 Crop Doctor and AD-26 Surveillance remain in honest unavailable adapter states pending parallel completion.
