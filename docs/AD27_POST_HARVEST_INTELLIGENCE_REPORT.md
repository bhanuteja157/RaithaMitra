# AD-27 — Advanced Post-Harvest Intelligence, Cold Storage & Economic Optimization

## 1. Implemented Functionality
- **Crop-Specific Storage Knowledge Base (`backend/app/features/post_harvest/storage_knowledge.py`)**: 15 scientifically referenced commodity profiles (`Tomato`, `Potato`, `Onion`, `Paddy`, `Wheat`, `Maize`, `Banana`, `Mango`, `Chilli`, `Groundnut`, `Cotton`, `Ragi`, `Carrot`, `Cabbage`, `Grapes`) citing ICAR, NHB, FAO, and USDA Agricultural Handbook No. 66, explicitly distinguishing refrigerated perishables from dry-stored grains/cotton.
- **Harvest Planning & Weather Advice (`backend/app/features/post_harvest/service.py`)**: Persistent harvest tracking (`harvest_records`) comparing estimated vs actual harvested quantities with Open-Meteo 48h rainfall and ambient temperature harvest guidance.
- **Persistent Inventory Ledger (`backend/app/features/post_harvest/inventory.py`)**: Transactional SQLite lot tracking (`post_harvest_lots` and `post_harvest_lot_events`) supporting creation, condition updates, `sale`, `transport`, `damage`, `discard`, and `reserve` events with non-negative stock guards and `idempotency_key` duplicate deduction prevention.
- **Intelligent Shelf-Life & Spoilage Risk (`shelf_life.py`, `spoilage_risk.py`)**: Transparent rule-based Q10/humidity/chilling/damage models explicitly labelled as estimates, never inventing IoT sensor values or claiming microbial lab detection.
- **Economic Decision Optimizer & Monte Carlo (`economic_optimizer.py`)**: Deterministic Sell-Now vs Store comparison, break-even future selling price, Pessimistic/Expected/Optimistic scenarios, and 1,000-trial NumPy Monte Carlo simulation.
- **Cold Storage Discovery (`facility_provider.py`)**: Optional Google Places lookup when `GOOGLE_PLACES_API_KEY` / `GOOGLE_MAPS_API_KEY` is configured, persistent farmer-entered facilities (`post_harvest_manual_facilities`), and clearly labelled demonstration entries.
- **Cross-Module Integration**:
  - **AD-24 Finance**: Idempotent synchronization of estimated/committed/recorded storage costs into `financial_transactions` (`category='storage'`); disposal/damage never creates cash income/payment entries.
  - **Smart Bidding**: Direct lot-to-listing creation reserving unreserved inventory.
  - **Transport Connect**: Vehicle capacity compatibility check with explicit verification of refrigerated vehicle availability.
  - **AD-23 Assistant**: Read-only `get_post_harvest_intelligence` tool with EN/KN/HI/TE responses.
- **Frontend Workspace (`frontend/src/app/post-harvest/page.tsx`)**: Upgraded 4-tab responsive workspace with KPI strip, Jury Demo Scenario preset, Recharts chart, Web Speech summary, and multilingual labels.

## 2. Database Changes (Non-Destructive)
Added 5 tables in `backend/app/db/database.py`:
- `harvest_records`
- `post_harvest_lots`
- `post_harvest_lot_events`
- `post_harvest_storage_records`
- `post_harvest_manual_facilities`

## 3. API Endpoints (`/api/v1/post-harvest/*`)
- `GET /knowledge`, `GET /summary`
- `POST /harvests`, `GET /harvests`, `PATCH /harvests/{record_id}`
- `POST /inventory`, `GET /inventory`, `PATCH /inventory/{lot_id}/conditions`, `POST /inventory/{lot_id}/events`, `GET /inventory/{lot_id}/history`
- `POST /inventory/{lot_id}/create-listing`, `POST /inventory/{lot_id}/prepare-transport`
- `POST /storage`, `GET /storage`
- `GET /facilities`, `POST /facilities/manual`
- `POST /shelf-life`, `POST /spoilage-risk`, `POST /economic-compare`

## 4. Verification & Limitations
- Verified via `pytest backend/tests/test_post_harvest_ad27.py -v`, full `pytest backend/tests -v`, and `npx tsc --noEmit && npm run build`.
- **Remaining Limitations**: Live Google Places cold storage lookup requires `GOOGLE_PLACES_API_KEY` / `GOOGLE_MAPS_API_KEY` in `.env`; live AGMARKNET market price feeds await AD-29; browser UI visual interaction was not executed in a live Chrome session.
