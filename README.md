# RaithaMitra — ರೈತ ಮಿತ್ರ

> **From Seed to Sale, One Intelligent Companion.**  
> *AI-Powered Predictive Agricultural Intelligence and Rural Economic Optimization System.*

**Team:** Syntax Squad  
**Competition:** HackWarts 2026  
**Domain:** AgriTech  
**Status:** Unified Platform v1.0

---

## 🌾 Overview

**RaithaMitra** (ರೈತ ಮಿತ್ರ) is ONE comprehensive, fully integrated agricultural decision intelligence platform designed to empower Indian farmers across all five competition focus areas:
1. **Farming & Precision Operations**: Unified farm digital twin, biophysical crop water modeling, phenological growth tracking.
2. **Crop & Soil Health**: FAO-56 Penman-Monteith crop water balance, Soil Health Card N-P-K nutrient guidance, offline MobileNetV2 leaf disease diagnostics.
3. **Precision Irrigation**: Real-time Open-Meteo agrometeorological integration, ET0 calculation, dynamic drip scheduling, rain avoidance logic.
4. **Food Supply & Post-Harvest**: Spoilage risk forecasting, cold chain optimization, WDRA warehouse receipting, collective farmer demand pooling.
5. **Rural Livelihoods & Finance**: Monte Carlo financial risk simulation ($P_{10}/P_{50}/P_{90}$ distributions, $VaR_{95}$), verified Indian government schemes (PM-KISAN, PMFBY, KCC), and multilingual conversational AI assistance (English, Kannada, Hindi).

---

## 🏛️ Architecture & Unified Single-Product Design

RaithaMitra enforces a strict single-product paradigm:
- **One Application:** Unified web dashboard built on Next.js 14 App Router, TypeScript, and Tailwind CSS.
- **One Backend:** Modular FastAPI service in Python 3.12 with Pydantic v2 schemas and deterministic data models.
- **One Shared Farm Context:** All 16 modules consume and update the identical authenticated farm profile, coordinates, soil characteristics, and crop stage.
- **One Centralized Intelligence Engine:** Multi-objective agronomic decision engine that resolves conflicting priorities (irrigation vs rain, foliar spray vs wind speed, sell vs cold-store).
- **Evidence-Grounded Guardrails:** Every numeric figure presented to the farmer carries explicit data provenance (`source`, `timestamp`, `quality`, and `uncertainty`).

---

## 🎨 Enterprise Design System Tokens

| Token | Hex Value | Application |
| :--- | :--- | :--- |
| **Primary Green** | `#166534` | Primary actions, branding, key highlights |
| **Dark Green** | `#14532D` | Brand header gradients, active sidebar items |
| **Accent Green** | `#22C55E` | Positive status badges, high vigor vegetation, growth icons |
| **Background (Light)** | `#F5F7F2` | Clean agronomic surface backdrop |
| **Background (Dark)** | `#09090B` | Modern SaaS dark mode canvas |
| **Surface (Light)** | `#FFFFFF` | Analytics cards, modals, tables |
| **Text Primary** | `#17251C` | High contrast readable typography |
| **Muted Text** | `#64748B` | Secondary metrics, descriptions, captions |
| **Warning** | `#D97706` | Soil moisture depletion, weather watch alerts |
| **Danger** | `#DC2626` | Critical water stress, disease cluster warnings |

---

## 📁 Repository Structure

```
RM/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI routes (/farms, /weather, /recommendations, /schemes)
│   │   ├── core/           # Configuration, settings, environment variables
│   │   ├── data/           # Government schemes, crop parameters, soil datasets
│   │   ├── engines/        # Biophysical FAO-56 engine, centralized decision engine
│   │   ├── schemas/        # Pydantic v2 domain schemas (Farm, Weather, Recommendation)
│   │   └── services/       # Farm persistence, Open-Meteo live weather service
│   └── tests/              # Pytest automated test suite (100% passing)
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js 14 App Router (all 16 module pages)
│   │   ├── components/     # Layout (Sidebar, TopBar, Shell), Dashboard cards, Modals
│   │   ├── context/        # Shared FarmContext (farm selector, language, theme)
│   │   ├── lib/            # Centralized translation dictionaries (en, kn, hi)
│   │   └── types/          # Shared TypeScript domain contracts
│   ├── tailwind.config.js
│   └── package.json
├── docs/
│   ├── REPOSITORY_AUDIT.md       # Technical audit of all 6 reference repositories
│   ├── ARCHITECTURE.md           # System architecture and domain model
│   ├── IMPLEMENTATION_STATUS.md  # 16-module status matrix
│   ├── API_CONTRACTS.md          # REST API specifications and OpenAPI contracts
│   └── THIRD_PARTY_ATTRIBUTION.md # Legal notices, copyright, licenses
├── .gitignore
├── .env.example
└── README.md
```

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on v26.13.1)
- **Python**: v3.11+ (tested on v3.12.10)
- **Git**

### 2. Backend Setup & Startup
```powershell
# Create and activate Python virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1

# Install backend dependencies
python -m pip install fastapi uvicorn pydantic httpx pytest numpy python-dotenv

# Run automated backend test suite
python -m pytest backend/tests/test_api.py -v

# Start FastAPI backend server (runs on http://127.0.0.1:8000)
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup & Startup
```powershell
cd frontend

# Install frontend dependencies
npm.cmd install

# Start Next.js development server (runs on http://localhost:3000)
npm.cmd run dev
```

### 4. Interactive URLs
- **Unified Frontend Dashboard**: `http://localhost:3000`
- **FastAPI Interactive API Docs (Swagger UI)**: `http://127.0.0.1:8000/api/v1/docs`
- **OpenAPI JSON Specification**: `http://127.0.0.1:8000/api/v1/openapi.json`
- **Health Check Endpoint**: `http://127.0.0.1:8000/api/v1/health`
