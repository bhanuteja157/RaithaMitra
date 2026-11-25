# Agricultural Market Intelligence — Status

- **Branch:** `feature/digital-farming`
- **Direct Route:** `/market-intelligence`
- **Status:** Implemented & TypeScript-verified (standalone Next.js module, zero shared file modifications).

## Implemented Capabilities
- Mandi price registry with crop/location filters, ₹/quintal to ₹/kg normalization, manual price entry, and clearly labelled fictional demonstration datasets.
- Market Profit Optimization ranking markets by net profit after transport, loading/unloading, packaging, commission, and spoilage, explaining why highest price may not yield highest profit.
- Price Trend Intelligence (7d/30d/90d demo + CSV history import) with average, min, max, volatility, direction, and 3-period moving average chart.
- Sell Now vs Sell Later simulator (immediate, store & sell later, split strategy, storage capacity check, break-even future price).
- Independent Buyer Offer Intelligence and Transportation Cost Optimizer (rejecting loads exceeding vehicle capacity, weight-proportional cost sharing).
- Seamless harvest-to-market transfer from `/digital-farming` via `localStorage` (`raithamitra_df_to_market_v1`).

## Optional Backend Integration
To expose the optional FastAPI status endpoint, the integration developer can register `backend.app.services.market_intelligence.market_service.router` in `backend/app/api/api.py`.
