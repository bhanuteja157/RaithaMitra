# AD-29 — Advanced Live Agricultural Market Intelligence & Price Prediction

## 1. Selected Official Data Provider & Configuration
- **Provider**: AGMARKNET via Data.gov.in Open Government Data API (Resource ID: `9ef84268-d588-465a-a308-a864a43d0070`).
- **Authentication**: Server-side `DATA_GOV_IN_API_KEY` (never exposed to frontend responses).
- **Current Environment Verification**: `DATA_GOV_IN_API_KEY` is not set in the local `.env` file (`DATA_GOV_IN_API_KEY_SET: False`), so live AGMARKNET retrieval remains unverified in this environment; provider parsing, deduplication, rate-limit/timeout handling, and cache fallback were verified using mocked provider tests, alongside persistent manual entry and CSV historical import.

## 2. Implemented Architecture (`backend/app/features/market_intelligence/`)
- **Normalization (`normalization.py`)**: Normalizes 19+ commodities and regional aliases, converts `INR/Quintal` (`100 kg`), `INR/Tonne` (`1,000 kg`), and `INR/kg`, rejects negative or inconsistent prices (`min > max`), and sanitizes CSV cells against formula injection.
- **Provider & Cache (`providers.py`, `cache.py`)**: Paginated Data.gov.in adapter with 12s timeout, limited retries, `429` handling, `market_provider_logs`, and `INSERT OR IGNORE` deduplication into `market_price_observations`.
- **Historical & Statistical Forecasting (`historical_analysis.py`, `forecasting.py`)**: Computes min/max/mean/median/volatility from persisted records without fabricating missing dates; evaluates Naive, Moving Average (3), Exponential Smoothing (`alpha=0.4`), and Linear Trend via chronological walk-forward backtesting (`MAE` / `RMSE`) and generates 7/15/30-day uncertainty intervals when sufficient history exists.
- **Market Net Return Optimizer & Alerts (`market_optimizer.py`, `alerts.py`)**: Ranks markets by transportation-adjusted net selling return, benchmarks buyer offers without auto-accepting bids, and evaluates user-scoped in-app price alerts.
- **Cross-Module & Assistant Integration**: Connects AD-24 Finance, AD-27 Post-Harvest, Smart Bidding, Transport Connect, and adds read-only `get_market_intelligence` tool to AD-23 (`EN/KN/HI/TE`).
- **Frontend (`MarketIntelligenceWorkspace.tsx`, `marketApi.ts`)**: 5-tab workspace with Jury Demo Scenario preset, Recharts net-return and forecast charts, CSV import, manual price entry, buyer offer benchmark, and in-app alerts.

## 3. Database Changes (Non-Destructive)
Added 6 tables in `backend/app/db/database.py`:
- `market_price_observations`
- `market_metadata`
- `market_provider_logs`
- `market_alert_preferences`
- `market_alerts`
- `market_imported_datasets`

## 4. Verification & Limitations
- Verified via `pytest backend/tests/test_market_intelligence_ad29.py -v`, full `pytest backend/tests -v`, and `npx tsc --noEmit && npm run build`.
- **Remaining Limitations**: Live Data.gov.in AGMARKNET retrieval requires `DATA_GOV_IN_API_KEY` in `.env`; browser UI interaction was not executed in a live Chrome session.
