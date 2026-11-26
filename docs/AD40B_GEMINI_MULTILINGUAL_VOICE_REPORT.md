# AD-40B — Gemini-Only Multilingual Live Voice Agent Report

**Project:** RaithaMitra (ರೈತ ಮಿತ್ರ) — *From Seed to Sale, One Intelligent Companion*  
**Target Branch:** `integration/final`  
**Baseline Commit:** `a9cade7` (AD-40A)  
**External AI Provider:** Google Gemini ONLY (`google-genai` Python SDK `3.6.1`, `@google/genai` TypeScript SDK)  
**Security Rule:** `GEMINI_API_KEY` remains strictly server-side in untracked `.env`; browsers receive only short-lived `v1beta` ephemeral Live API tokens.

---

## 1. Live `GEMINI_API_KEY` Verification Results

Verified using the official `google-genai` (`3.6.1`) Python SDK against `.env` without printing or exposing any secret value (`key_present: True`, length `53`):

1. **API Authentication & Connectivity:** Passed. Authenticated against both `v1` and `v1beta`.
2. **Available Gemini Models:**
   - `v1`: `28` models returned.
   - `v1beta`: `65` models returned, including `gemini-4-hydrogen`, `gemini-4-argon`, `gemini-4-neon`, `gemini-4-carbon`, `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.8-live`, `gemini-3.8-live-extended-thinking`, `gemini-3.5-transcribe`, `gemini-3.5-transcribe-live`, `gemini-3.5-live-translate-preview`, `gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts`, and `gemini-decision-1`.
3. **Gemini Live API Access:**
   - `client.auth_tokens.create` (`v1beta`): Passed (`auth_tokens/...` ephemeral token provisioned).
   - `gemini-3.8-live` WebSocket session (`Modality.AUDIO` + `input_audio_transcription` + `output_audio_transcription`): Passed (`193,922` PCM bytes returned + both user and model transcripts).
   - `gemini-3.8-live-extended-thinking`: Requires explicit `thinking_config` (`1007 Thinking level must be specified for this model.`).
   - `gemini-3.5-transcribe-live`: Timed out (`TimeoutError`) on single short burst in probe; unary `gemini-3.5-transcribe` and `gemini-3.8-live` `input_audio_transcription` succeeded cleanly.
4. **Audio Transcription (`gemini-3.5-transcribe`):** Passed across English, Kannada, Hindi, and Telugu WAV speech clips generated via Gemini TTS.
5. **Native Audio Generation (TTS):**
   - `gemini-3.8-flash-tts`: Passed (`audio/wav`, `RIFF` WAV, `177,628` bytes on EN probe).
   - `gemini-3.8-flash-lite-tts`: Passed (`audio/wav`, `RIFF` WAV, `215,548` bytes on EN probe).
6. **Kannada (`kn`), Telugu (`te`), Hindi (`hi`), and English (`en`) Language Support:**
   - Text generation (`gemini-3.5-flash-lite`), WAV TTS synthesis (`gemini-3.8-flash-tts`), and speech-to-text transcription (`gemini-3.5-transcribe`) all succeeded across all four languages.
7. **Observed Free-Tier Quota & Model Restrictions:**
   - `gemini-4-argon`, `gemini-4-neon`, and `gemini-4-carbon` returned `429 RESOURCE_EXHAUSTED` (`limit: 0` requests/minute and `0` requests/day on Free Tier).
   - `gemini-4-hydrogen` and `gemini-3.8-flash` returned transient `503 UNAVAILABLE` / `504 DEADLINE_EXCEEDED` during high demand, while `gemini-3.5-flash-lite` (`interactions_v1`), `gemini-3.1-flash-lite` (`generate_content_v1beta`), and `gemini-decision-1` (`noul: 0.964`) succeeded cleanly.
   - Accordingly, [`gemini_voice.py`](file:///C:/Users/ppraj/Projects/RM/backend/app/features/assistant/gemini_voice.py) uses resilient fallback chains (`gemini-4-hydrogen` -> `gemini-3.5-flash-lite` -> `gemini-3.1-flash-lite` for text; `gemini-3.8-flash-lite-tts` -> `gemini-3.8-flash-tts` for TTS; `gemini-3.5-transcribe` -> `gemini-3.5-flash-lite` for transcription).

---

## 2. Implemented AD-40B Architecture

### Backend (`backend/app/features/assistant/`)
- [`gemini_voice.py`](file:///C:/Users/ppraj/Projects/RM/backend/app/features/assistant/gemini_voice.py):
  - Official `google-genai` SDK integration (`interactions`, `models.generate_content`, `files.upload`, `auth_tokens.create`).
  - `detect_spoken_language()` supporting Unicode scripts (`en`, `kn`, `hi`, `te`) and mixed-language Romanized speech (Kanglish, Hinglish, Tenglish).
  - `transcribe_audio_with_gemini()`, `synthesize_gemini_tts()`, `generate_gemini_text()`, `create_live_ephemeral_token()`, and role-authorized `get_live_function_declarations()`.
- [`general_qa.py`](file:///C:/Users/ppraj/Projects/RM/backend/app/features/assistant/general_qa.py), [`service.py`](file:///C:/Users/ppraj/Projects/RM/backend/app/features/assistant/service.py), [`intent_engine.py`](file:///C:/Users/ppraj/Projects/RM/backend/app/features/assistant/intent_engine.py):
  - Replaced legacy `gemini-2.0-flash` REST URLs with `generate_gemini_text()` via `google-genai` while preserving AD-39 offline fallback and test monkeypatch compatibility.
- [`schemas.py`](file:///C:/Users/ppraj/Projects/RM/backend/app/features/assistant/schemas.py) & [`router.py`](file:///C:/Users/ppraj/Projects/RM/backend/app/features/assistant/router.py):
  - `POST /api/v1/assistant/live/token` — authenticated, rate-limited, farm-ownership-checked ephemeral token provisioning for `gemini-3.8-live`.
  - `POST /api/v1/assistant/live/tool-execute` — authenticated RBAC tool bridge grounding Live API voice calls in real RaithaMitra modules and UI directives.
  - `POST /api/v1/assistant/transcribe` — multipart audio STT (`<= 15 MB`, audio MIME validated).
  - `POST /api/v1/assistant/tts` — Gemini native audio WAV synthesis (`503` graceful fallback when offline).
  - `POST /api/v1/assistant/voice/turn` — unified audio-in -> transcribe -> tool/reasoning -> WAV-out pipeline.
  - `POST /api/v1/assistant/chat/stream` — SSE `text/event-stream` progressive response streaming.
  - `GET /api/v1/assistant/status` — reports `sdk: "google-genai"`, `live_api_available`, `tts_available`, `transcribe_available`, and verified model names.

### Frontend (`frontend/src/`)
- [`geminiLiveVoice.ts`](file:///C:/Users/ppraj/Projects/RM/frontend/src/lib/geminiLiveVoice.ts):
  - Official `@google/genai` Live API client connecting with short-lived ephemeral tokens.
  - Real `navigator.mediaDevices.getUserMedia` microphone capture, 16 kHz PCM resampling, RMS mic level metering, 24 kHz PCM playback queue, instant barge-in `interruptPlayback()`, `MediaRecorder` `AudioClipRecorder`, and WAV playback helpers.
- [`assistantApi.ts`](file:///C:/Users/ppraj/Projects/RM/frontend/src/lib/assistantApi.ts):
  - Client wrappers for `/live/token`, `/live/tool-execute`, `/voice/turn`, `/tts`, and SSE `/chat/stream`.
- [`PersistentVoiceAssistant.tsx`](file:///C:/Users/ppraj/Projects/RM/frontend/src/components/assistant/PersistentVoiceAssistant.tsx) & [`assistant/page.tsx`](file:///C:/Users/ppraj/Projects/RM/frontend/src/app/assistant/page.tsx):
  - Unified ChatGPT-Voice-inspired interface with **Live Voice (`gemini-3.8-live`)**, animated mic-level voice orb, real-time input/output streaming captions, language detection badge (`en`/`kn`/`hi`/`te`), continuous hands-free consent toggle, stop/interrupt/mute controls, SSE text streaming, `sessionStorage` conversation sync, and automatic fallback to local intelligence & browser speech when Gemini is unavailable.

---

## 3. Observed Verification Results

- **Backend Regression Suite (`.\.venv\Scripts\python.exe -m pytest backend\tests -v`):** **`149 passed, 4 warnings in 338.47s`** (includes [`test_ad40b_gemini_voice.py`](file:///C:/Users/ppraj/Projects/RM/backend/tests/test_ad40b_gemini_voice.py) covering mixed-language detection, 401/403 RBAC, upload validation, offline 503 fallback, SSE `/chat/stream`, `/live/tool-execute`, `/voice/turn`, and live Gemini TTS -> Transcribe -> Ephemeral Token roundtrip).
- **TypeScript (`cd frontend && npx.cmd tsc --noEmit`):** Exited `0` (zero errors).
- **Next.js Production Build (`cd frontend && npm.cmd run build`):** Exited `0` — `40/40` static pages generated plus dynamic `/passport/[batchCode]`.

---

## 4. Honest Limitations

- Physical microphone hardware capture and speaker playback in an interactive browser window depend on user browser media permissions and were verified via TypeScript compilation, Next.js production build, and live backend Gemini audio/WebSocket API tests rather than an automated physical-mic browser session.
- Free-tier Gemini API rate limits and transient `503`/`504` spikes apply on `gemini-4-hydrogen` / `gemini-3.8-flash` and `0` RPM/RPD limits apply on `gemini-4-argon`/`neon`/`carbon` under the current Free Tier key; resilient fallback models handle these transparently.
- `.env` remains strictly private and untracked; changes are committed locally on `integration/final` without pushing or merging other branches.
