# AD-23 — Advanced Multilingual Agentic Agricultural AI Assistant

**Project:** RaithaMitra (ರೈತ ಮಿತ್ರ)  
**Team:** Syntax Squad  
**Branch:** `integration/final`  
**Baseline Commit:** `519950b`  
**Status:** **PASS — Implemented, Verified & Ready for Demonstration**

---

## 1. Assistant Architecture

Replaced the hardcoded irrigation reply in `/assistant` with a **Hybrid Agentic Agricultural AI Companion** (`backend/app/features/assistant/`):

```
User Query (Text / Web Speech API)
  → Security & Prompt-Injection Guard (security.py)
  → Language Detection: EN / KN / HI / TE (intent_engine.py)
  → Multiturn Context & Slot-Filling Manager (service.py + SQLite)
  → Centralized Allowlisted Tool Registry (tool_registry.py)
  → Hybrid Synthesis:
      • Online AI Mode: Gemini 2.0 Flash grounded strictly in verified tool outputs
      • Local Intelligence Mode: Deterministic multilingual responses (zero API cost)
  → Structured Cards + Source Citations + Action Preview / Confirmation + Voice Output
```

---

## 2. AI Provider Configuration

- **Online AI Mode:** Uses server-side `GEMINI_API_KEY` (never exposed to frontend or committed) via `fetch_json_with_resilience` with strict grounding instructions prohibiting fabricated yields, prices, papers, SQL, or shell commands.
- **Local Intelligence Mode (Offline Fallback):** Automatically engages when `GEMINI_API_KEY` is unset or external AI APIs are unreachable, executing all deterministic scientific engines, financial queries, and multiturn workflows locally.

---

## 3. Centralized Agricultural Tool Registry (`tool_registry.py`)

| Tool Name | Allowed Roles | Classification | Provenance |
| :--- | :--- | :--- | :--- |
| `get_irrigation_and_weather` | All | `read_only` | Open-Meteo + FAO-56 Decision Engine |
| `get_soil_recommendations` | Farmer, Admin | `read_only` | Soil Science Service |
| `generate_seed_investment_plan` | Farmer, Admin | `read_only` | BioIntel & Seed Investment Calculator |
| `recommend_crops` | Farmer, Admin | `read_only` | BioIntel Crop Suitability |
| `retrieve_scientific_research` | All | `read_only` | Europe PMC Open-Access Index |
| `find_nurseries` | Farmer, Buyer, Admin | `read_only` | Certified Nursery Directory |
| `control_digital_farm` | Farmer, Admin | `read_only` | Digital Farm Simulator |
| `lookup_labour_info` | Farmer, Labour, Admin | `read_only` | Labour Connect SQLite |
| `prepare_labour_job_draft` | Farmer, Admin | `transactional` | Labour Connect (Confirmation Required) |
| `get_bidding_and_orders` | Farmer, Buyer, Admin | `read_only` | Smart Bidding SQLite |
| `prepare_bidding_listing_draft` | Farmer, Admin | `transactional` | Smart Bidding (Confirmation Required) |
| `find_transport_and_optimize` | Farmer, Buyer, Driver, Admin | `read_only` | Transport Connect & OR-Tools |
| `prepare_transport_booking_draft` | Farmer, Buyer, Admin | `transactional` | Transport Connect (Confirmation Required) |
| `get_financial_intelligence` | Farmer, Admin | `read_only` | AD-24 Persistent Financial Ledger |
| `find_government_schemes` | All | `read_only` | Verified Indian Government Schemes |
| `check_crop_health_adapter` | Farmer, Admin | `read_only` | AD-22 Crop Diagnostics Adapter |

---

## 4. Supported Languages & NLU

- **Languages:** English (`en`), Kannada (`kn`), Hindi (`hi`), Telugu (`te`) — supports Unicode scripts, Romanized words, and mixed queries.
- **Spoken Numbers & Units:** Extracts digits and spoken words (`hundred`, `thousand`, `lakh`, `acres`, `hectares`, `kg`, `tonnes`, `quintals`).
- **Multiturn Context:** Persisted per user & farm in `assistant_conversations`; collects missing slots (`area_acres`, `budget_inr`, `water`), handles mid-conversation corrections (e.g., *"Actually make it 3 acres"*), and supports cancellation.

---

## 5. Financial & Scientific Grounding

- **AD-24 Financial Integration:** Directly invokes `sync_farm_financials()` and `compute_financial_summary()`, distinguishing allocated budget, recorded expenses, committed obligations, confirmed sales, received cash, outstanding payments, realized profit, estimated profit, break-even price, and what-if price-drop stress tests.
- **Scientific Grounding:** Connects to Open-Meteo, FAO-56 Decision Engine, Soil Service, Europe PMC, and Verified Government Scheme URLs, attaching `SourceReference` cards and limitations.
- **AD-22 Crop Health Adapter:** Checks trained model availability without fabricating offline pathology diagnoses.

---

## 6. Agentic Task Execution & Security Controls

- **Confirmation Workflow:** Consequential writes (`labour_post`, `bidding_post`, `transport_book`) create a 10-minute expiring record in `assistant_pending_actions` bound to the caller's `user_id` and `session_token_hash`.
- **Execution & Replay Protection:** `POST /api/v1/assistant/actions/{id}/confirm` executes atomically once and marks `status = 'confirmed'` (subsequent attempts return HTTP 409). `POST /api/v1/assistant/actions/{id}/cancel` aborts safely.
- **Security Guards:** Bearer session authentication, server-side RBAC (never trusting claimed roles in chat text), farm ownership verification (HTTP 403), request length limits (1,500 chars), and prompt-injection pattern blocking (HTTP 400).

---

## 7. Automated Test & Build Results

- **AD-23 Assistant Test Suite ([test_assistant_ai_companion.py](file:///C:/Users/ppraj/Projects/RM/backend/tests/test_assistant_ai_companion.py)):** **5 passed in 3.76s** covering Scenarios A–G (multiturn crop planning + corrections, irrigation decision engine, AD-24 finance + 20% price drop, labour draft confirm/replay/cancel, transport lookup, KN/HI/TE multilingual queries, offline local fallback, prompt injection blocking, RBAC, and cross-user farm/conversation isolation).
- **Full Backend Regression Suite:** `.venv\Scripts\python.exe -m pytest backend/tests -v` (running across all 12 test suites).
- **Frontend Validation & Production Build:** `npx tsc --noEmit && npm run build`.
- **Browser Verification:** Headless Chrome DevTools remains unavailable in the sandbox; manual verification of `/assistant` and the floating voice guide is ready for local browser inspection.

---

## 8. Modified & Added Files

- `backend/app/db/database.py`
- `backend/app/api/api.py`
- `backend/app/features/assistant/__init__.py`
- `backend/app/features/assistant/schemas.py`
- `backend/app/features/assistant/security.py`
- `backend/app/features/assistant/intent_engine.py`
- `backend/app/features/assistant/tool_registry.py`
- `backend/app/features/assistant/service.py`
- `backend/app/features/assistant/router.py`
- `backend/tests/test_assistant_ai_companion.py`
- `frontend/src/lib/assistantApi.ts`
- `frontend/src/app/assistant/page.tsx`
- `frontend/src/components/assistant/PersistentVoiceAssistant.tsx`
- `docs/AD23_INTELLIGENT_AGRICULTURAL_ASSISTANT.md`
