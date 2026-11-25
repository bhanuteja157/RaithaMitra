# AD-30 — Centralized Agricultural Decision Intelligence & Multi-Objective Economic Optimization

## 1. Unified Intelligence Architecture
AD-30 connects all completed RaithaMitra modules under the `OBSERVE -> PREDICT -> SIMULATE -> OPTIMIZE -> ACT -> EVALUATE` lifecycle in `backend/app/features/decision_intelligence/`:
- **Unified Context Collector (`context_collector.py`)**: Aggregates Farm Profile, Open-Meteo Weather & FAO-56 (`weather_service`), `DecisionEngine`, AD-24 Financial Ledger, AD-25 Cached Satellite Indices, AD-27 Post-Harvest Inventory, AD-28 Equipment Connect, AD-29 Market Observations, Smart Bidding, Labour Connect, Government Schemes, and read-only status adapters for AD-22 Crop Doctor and AD-26 Disease Surveillance.
- **Evidence Registry (`evidence_registry.py`)**: Classifies every evidence item (`measured`, `official_observation`, `cached_observation`, `user_entered`, `scientifically_calculated`, `estimated`, `simulated`, `demonstration`, `unavailable`) and prevents demonstration/unavailable items from silently driving real recommendations.
- **Cross-Module Conflict Resolver (`conflict_resolver.py`)**: Detects and resolves Conflicts A–H (Irrigation vs Rainfall, Seed/Cultivation vs Budget, Market Price vs Transport, Storage vs Spoilage, Harvest vs Weather, Equipment vs Labour, Satellite Stress vs Chemical Treatment, Budget vs Commitments).
- **Multi-Objective Optimizer & Hard Constraints (`optimizer.py`)**: Applies hard feasibility checks (budget shortfall, available water) before scoring candidates under 6 configurable preference profiles (`balanced`, `max_profit`, `min_cost`, `water_conservation`, `low_risk`, `sustainable`).
- **Prioritized Action Plan, Dependency Graph & Explainability (`action_planner.py`)**: Groups actions into 5 operational buckets, constructs a 7-step Seed-to-Sale Dependency Graph, and attaches structured `what/why/modules/data/alternatives/assumptions/what_could_change/unavailable_info` explanations.
- **Cross-Module What-If Simulator (`scenario_simulator.py`)**: Simulates cultivation, water, spoilage, market price, and transport trade-offs without mutating actual SQLite ledgers.
- **Persistence, Action Previews & Feedback (`service.py`, `router.py`)**: Stores decision runs, evidence, recommendations, user preferences, idempotent action previews/confirmations (`409` replay protection), and outcome feedback.
- **AD-23 Assistant & Frontend Dashboard (`frontend/src/app/decision-intelligence/page.tsx`)**: Added `get_farm_decision_summary` assistant tool (`EN/KN/HI/TE`) and upgraded `/decision-intelligence` into a 5-tab workspace.

## 2. Database Changes (Non-Destructive)
Added 6 tables in `backend/app/db/database.py`:
- `agricultural_decision_runs`
- `agricultural_decision_evidence`
- `agricultural_decision_recommendations`
- `agricultural_decision_actions`
- `agricultural_decision_preferences`
- `agricultural_decision_feedback`

## 3. Verification & Limitations
- Verified via `pytest backend/tests/test_decision_intelligence_ad30.py -v`, full `pytest backend/tests -v`, and `npx tsc --noEmit && npm run build`.
- **Remaining Limitations**: AD-22 Crop Doctor ML model and AD-26 Community Disease Surveillance are integrated via read-only unavailable/adapter states pending completion; live AGMARKNET requires `DATA_GOV_IN_API_KEY`; browser UI interaction was not executed in a live Chrome session.
