# AD-23 — Advanced Multilingual Agentic Agricultural Intelligence Assistant

**Project:** RaithaMitra (ರೈತ ಮಿತ್ರ) — Team Syntax Squad  
**Feature:** RaithaMitra AI — Your Intelligent Farming Companion  
**Branch:** `feature/intelligent-agri-assistant`  
**Commit Message:** `feat(assistant): implement multilingual context-aware agricultural intelligence and tool calling (AD-23)`

---

## 1. Architecture Overview

AD-23 replaces the hardcoded irrigation stub on `frontend/src/app/assistant/page.tsx` with a full-stack, authenticated, multilingual, tool-calling agricultural intelligence system connecting RaithaMitra's seed-to-sale modules.

### Backend Package (`backend/app/features/agri_assistant/`)

- `__init__.py` — Exposes the feature FastAPI router.
- `schemas.py` — Pydantic v2 request/response contracts (`ChatMessageRequest`, `ChatMessageResponse`, `ResponseCard`, `ProactiveAlert`, `EvidenceSource`, `SuggestedAction`, `ToolExecutionStep`, `ConfirmActionRequest`, `ConfirmActionResponse`, `ToolDescriptor`).
- `safety.py` — Input sanitization (`MAX_MESSAGE_LENGTH=2000`), prompt injection / SQL / script / secret-exfiltration detection, sliding-window per-user rate limiting, strict role-based tool & action allowlists (`TOOL_ROLE_ALLOWLIST`, `ACTION_ROLE_ALLOWLIST`), secret redaction, and untrusted text wrapping.
- `context.py` — Bearer session authentication against SQLite `user_sessions` + `users`, strict farm ownership resolution (`resolve_authorized_farm`), multilingual entity extraction (crops, area in acres/hectares, budget in INR/k/lakh, water availability, soil pH/NPK) across English, Kannada, Hindi, and Telugu, conversation memory merging, and agricultural intent classification.
- `conversation_store.py` — Persistent SQLite conversation, message, and idempotent action confirmation store (`agri_conversations`, `agri_messages`, `agri_action_confirmations`) with user-scoped access checks.
- `tool_registry.py` — Controlled 13-tool registry (Tools A–M) backed by existing RaithaMitra services and SQLite tables.
- `llm_provider.py` — Configurable LLM abstraction supporting Google Gemini, OpenAI-compatible APIs, and deterministic offline multilingual synthesis.
- `response_builder.py` — Builds structured UI cards, contextual proactive alerts (from actual timestamps/records), evidence citations, and localized deterministic replies.
- `service.py` — End-to-end orchestration: validate -> authenticate -> authorize farm -> load/update memory -> draft confirmation if consequential -> execute read-only tools in parallel -> compile cards/alerts/citations -> synthesize reply -> persist turn.
- `router.py` — Mounted at `/api/v1/assistant` in `backend/app/api/api.py`.

### Endpoints

- `POST /api/v1/assistant/chat`
- `GET /api/v1/assistant/conversations`
- `POST /api/v1/assistant/conversations`
- `GET /api/v1/assistant/conversations/{conversation_id}`
- `DELETE /api/v1/assistant/conversations/{conversation_id}`
- `POST /api/v1/assistant/actions/confirm`
- `GET /api/v1/assistant/tools`

---

## 2. LLM Provider Configuration

Configured strictly via backend environment variables in `backend/app/core/config.py`:

- `LLM_PROVIDER`: `auto` (default), `gemini`, `openai`, or `offline`
- `GEMINI_API_KEY`: Backend-only Google Gemini API key
- `GEMINI_MODEL`: Default `gemini-2.0-flash`
- `OPENAI_API_KEY`: Optional OpenAI-compatible API key
- `OPENAI_BASE_URL`: Default `https://api.openai.com/v1`
- `OPENAI_MODEL`: Default `gpt-4o-mini`
- `LLM_TIMEOUT_S`: Default `8.0` seconds

All numerical calculations (seed rates, cultivation investment, FAO-56 ETc/irrigation volume, soil pH/NPK thresholds, market net proceeds, freight, Monte Carlo profit) are computed deterministically by backend engines and passed to the LLM inside `<verified_tool_data>` with strict grounding rules.

---

## 3. Implemented Agricultural Tools (Tools A–M)

| Tool | ID | Backend Source | Role Scope |
|---|---|---|---|
| Tool A — Farm Context | `farm_context` | SQLite `farms` + ownership-checked `farm_service` | `farmer`, `admin` |
| Tool B — Weather Intelligence | `weather_intelligence` | `weather_service.get_weather` (Open-Meteo + calibrated fallback) | All authenticated roles |
| Tool C — BioIntel | `biointel` | `biotech_service`, `indian_ag_evidence`, `nursery_service`, calibrated crop economics | `farmer`, `buyer`, `admin` |
| Tool D — Precision Irrigation | `precision_irrigation` | `scientific_irrigation_service` (FAO-56) + `decision_engine` | `farmer`, `admin` |
| Tool E — Soil Intelligence | `soil_intelligence` | `soil_service` (ICAR SHC thresholds; never invents missing NPK) | `farmer`, `admin` |
| Tool F — Crop Doctor | `crop_doctor` | `diagnostics_service.check_model_availability` + diagnostic history guard | `farmer`, `admin` |
| Tool G — Digital Farm | `digital_farm` | `farm_twin_service` + validated frontend `digital_farm_context` | `farmer`, `admin` |
| Tool H — Labour Connect | `labour_connect` | SQLite `labour_profiles` & `labour_jobs` | `farmer`, `labour`, `admin` |
| Tool I — Smart Bidding | `smart_bidding` | SQLite `bidding_listings`, `bidding_bids`, `purchase_orders` | `farmer`, `buyer`, `admin` |
| Tool J — Transport Connect | `transport_connect` | SQLite `transport_vehicles`, `transport_bookings` | `farmer`, `buyer`, `driver`, `admin` |
| Tool K — Market Intelligence | `market_intelligence` | `DATA_GOV_IN_API_KEY` check, manual prices, Smart Bidding bids, labelled demo APMCs, Sell-vs-Wait math | `farmer`, `buyer`, `admin` |
| Tool L — Finance | `finance` | SQLite orders/bookings/jobs + `simulation_service` (AD-24 ledger-ready) | `farmer`, `admin` |
| Tool M — Government Schemes | `government_schemes` | `INDIAN_GOVERNMENT_SCHEMES` (PM-KISAN, PMFBY, SHC, PMKSY, KCC) | All authenticated roles |

---

## 4. Conversation Persistence & Memory

Additive SQLite tables added via `init_db()` in `backend/app/db/database.py`:

- `agri_conversations` — Stores user-isolated threads, active `farm_id`, `language`, `title`, and `memory_json` (`selected_crop`, `comparison_crops`, `area_acres`, `budget_inr`, `water_availability`, `soil_ph`, NPK, `last_intent`).
- `agri_messages` — Stores each user/assistant turn with executed tools, cards, alerts, citations, suggested actions, and follow-ups.
- `agri_action_confirmations` — Tracks pending/confirmed/cancelled/executed/failed consequential operations with unique `idempotency_key` and `BEGIN IMMEDIATE` transactional locking to prevent duplicate execution.

---

## 5. Supported Languages & Speech

- **Supported UI & Response Languages:** English (`en`), Kannada (`kn`), Hindi (`hi`), Telugu (`te`).
- Mixed-language agricultural queries and script-native crop/area/budget/water terms are parsed in `context.py`.
- Speech input (`SpeechRecognition`) and speech output (`speakWithDeviceVoice` / `getBcp47ForLanguage`) reuse `frontend/src/lib/assistantVoice.ts` without modifying AD-19 voice or spoken-number parser files. When a device voice is unavailable for `kn`/`hi`/`te`, the UI displays a clear text fallback notice.

---

## 6. Security Controls

- Server-side Bearer session validation via SQLite `user_sessions`.
- Strict farm ownership verification (`403 Forbidden` on cross-user or cross-role farm access).
- Role-based tool & write-action allowlists (`403 Forbidden` on unauthorized role actions).
- Prompt injection, secret exfiltration, script tag, and SQL/code execution rejection (`400 Bad Request`).
- Per-user sliding-window rate limiting (`429 Too Many Requests`).
- Mandatory explicit user confirmation (`Confirm` / `Cancel`) for consequential writes (`labour_post`, `bidding_post`, `transport_book`), with transactional duplicate-execution prevention (`409 Conflict` on replay).
- Secret redaction on synthesized responses and external text sanitization before LLM prompt construction.

---

## 7. Verification & Test Results

### Backend Tests

- **AD-23 Suite (`backend/tests/test_agri_assistant.py`):** **20 passed, 1 skipped** (`test_22_live_gemini_provider_if_configured` skipped because `GEMINI_API_KEY` is not configured in the environment).
  - Covers all 20 mandatory scenarios (crop recommendation, maize vs tomato comparison, seed calculation, irrigation & missing sensor caveat, missing soil NPK handling, weather, market sell-vs-wait, bidding orders, transport status, Kannada, Hindi, Telugu, multi-turn conversation memory, unauthorized farm/role rejection, missing LLM credentials, external API timeout handling, prompt injection rejection, confirmation gating, duplicate execution prevention) plus mocked Gemini synthesis (`test_21_mocked_gemini_llm_synthesis`).
- **Full Backend Regression Suite (`backend/tests/`):** **79 passed, 1 skipped** (`pytest backend/tests/ -q`).

### Frontend Verification

- **TypeScript Check (`npx tsc --noEmit`):** Passed with exit code 0.
- **Next.js Production Build (`npm run build`):** Passed cleanly across all 38 routes (`/assistant` compiled at `15.2 kB`).

### Live Server & Browser Verification

- **Live HTTP Verification (against running `uvicorn` on `127.0.0.1:8000` and `next start` on `127.0.0.1:3000`):**
  - `GET /api/v1/health` -> `200 healthy`
  - `GET /assistant` -> `200 OK` (rendered RaithaMitra AI workspace HTML)
  - `POST /api/v1/assistant/chat` (English crop recommendation) -> `200 OK`, intent `crop_recommendation`, 4 tools executed, 3 structured cards returned.
  - `POST /api/v1/assistant/chat` (Kannada `"ನನ್ನ ಜಮೀನಿಗೆ ಯಾವ ಬೆಳೆ ಸೂಕ್ತ?"`) -> `200 OK`, language `kn`, intent `crop_recommendation`.
- **Chrome DevTools Automated Screenshots:** Not captured during this session because Chrome remote debugging (`DevToolsActivePort`) was not enabled in the local Chrome instance (`chrome://inspect/#remote-debugging`).

---

## 8. Offline Limitations

- When `GEMINI_API_KEY` and `OPENAI_API_KEY` are unset (or when external LLM APIs time out), RaithaMitra AI switches to **Deterministic Offline Tools Mode**, returning verified tool calculations and structured cards with `offline_fallback=true` rather than open-ended conversational prose.
- When Open-Meteo or Europe PMC is unreachable, `weather_service` and `biotech_service` fall back to calibrated climatology/curated ICAR citations explicitly labelled as fallback/curated data.
- Demonstration APMC market benchmarks are used unless `DATA_GOV_IN_API_KEY` or manual farmer prices/Smart Bidding bids are present.

---

## 9. Modified & Added Files

### Added
- `backend/app/features/agri_assistant/__init__.py`
- `backend/app/features/agri_assistant/schemas.py`
- `backend/app/features/agri_assistant/safety.py`
- `backend/app/features/agri_assistant/context.py`
- `backend/app/features/agri_assistant/conversation_store.py`
- `backend/app/features/agri_assistant/tool_registry.py`
- `backend/app/features/agri_assistant/llm_provider.py`
- `backend/app/features/agri_assistant/response_builder.py`
- `backend/app/features/agri_assistant/service.py`
- `backend/app/features/agri_assistant/router.py`
- `backend/tests/test_agri_assistant.py`
- `frontend/src/lib/assistantApi.ts`
- `frontend/src/components/assistant/AssistantResponseCards.tsx`
- `docs/AD23_INTELLIGENT_AGRI_ASSISTANT.md`

### Modified
- `backend/app/api/api.py` (registered `agri_assistant_router`)
- `backend/app/core/config.py` (added `LLM_PROVIDER`, `GEMINI_MODEL`, `OPENAI_*`, `LLM_TIMEOUT_S`)
- `backend/app/db/database.py` (added `agri_conversations`, `agri_messages`, `agri_action_confirmations` tables & indexes)
- `frontend/src/app/assistant/page.tsx` (replaced hardcoded stub with full multilingual RaithaMitra AI workspace)

### Preserved Untouched
- `frontend/src/components/assistant/PersistentVoiceAssistant.tsx` (AD-19 preserved)
- `frontend/src/lib/assistantVoice.ts` (AD-19 spoken-number parser & voice logic preserved)
- `frontend/src/app/login/page.tsx`, `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/components/layout/TopBar.tsx`, Digital Farm rendering, and AD-22 diagnostics services.

---

## 10. Remaining Integration Requirements

1. **AD-22 Crop Doctor Merge:** Once AD-22 ONNX leaf disease model weights and diagnostic history table (`crop_diagnostics_history`) are merged, Tool F (`crop_doctor`) will automatically transition from `unavailable` to `operational`.
2. **AD-24 Financial Ledger Merge:** Tool L (`finance`) currently exposes `ad24_ledger_ready: true` and `ad24_ledger_connected: false`; connect AD-24 ledger queries once merged.
3. **Optional Live API Credentials:** Configure `GEMINI_API_KEY` (or `OPENAI_API_KEY`) and `DATA_GOV_IN_API_KEY` in `.env` for live LLM synthesis and live AGMARKNET market feeds.
