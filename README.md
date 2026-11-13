# AERIS — Real-Time Air Quality Intelligence

Monitor real-time air quality, explore historical AQI trends, track pollutants, and understand the air around you.

## Overview

AERIS is a full-stack air quality monitoring platform that provides:

- **Real-time AQI** from global data sources (Open-Meteo, OpenAQ)
- **Historical trends** with 24-hour and 7-day charts
- **Pollutant monitoring** (PM2.5, PM10, CO, NO2, SO2, O3)
- **Global location search** with worldwide coverage
- **Interactive maps** with monitoring station data
- **Daily push notifications** for air quality updates
- **Dual AQI standards** — US EPA AQI and Indian CPCB NAQI
- **Firebase authentication** with Google Sign-In

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, Bootstrap 5, Recharts, Leaflet |
| Backend | Python FastAPI, SQLAlchemy, Alembic, APScheduler |
| Database | PostgreSQL |
| Auth | Firebase Authentication |
| APIs | Open-Meteo, OpenAQ, Nominatim |
| Notifications | Web Push (VAPID) |

## Project Structure

```
AQI-Meter/
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/       # REST API routes
│   │   ├── core/      # Config, database, security
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   ├── services/  # External API integrations
│   │   └── utils/     # Helpers
│   ├── alembic/       # Database migrations
│   ├── tests/         # Unit tests
│   └── main.py        # Entry point
├── frontend/          # React application
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Route pages
│   │   ├── contexts/    # React contexts
│   │   ├── services/    # API client
│   │   ├── hooks/       # Custom hooks
│   │   ├── utils/       # Utilities
│   │   └── styles/      # CSS
│   └── public/          # Static assets
├── .env.example       # Environment template
└── docker-compose.yml # Local development
```

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 15+
- Firebase project (for authentication)

### 1. Clone & Configure

```bash
git clone <repo-url>
cd AQI-Meter
cp .env.example .env
# Edit .env with your database URL and API keys
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Edit .env with Firebase config

pnpm install
pnpm dev
```

### 4. Open in Browser

Navigate to `http://localhost:5173`

## Environment Variables

See `.env.example` for all configuration options. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `VAPID_PRIVATE_KEY` | VAPID private key for push notifications |
| `VAPID_PUBLIC_KEY` | VAPID public key |
| `OPENAQ_API_KEY` | OpenAQ API key (optional) |

## Data Sources

| Source | Type | Coverage |
|--------|------|----------|
| [Open-Meteo](https://open-meteo.com/en/docs/air-quality-api) | Model estimates | Global |
| [OpenAQ](https://openaq.org/) | Station measurements | Worldwide monitoring networks |
| [Nominatim](https://nominatim.openstreetmap.org/) | Geocoding | Global |

## AQI Standards

AERIS supports two AQI classification systems:

- **US EPA AQI** — Default for most countries
- **Indian CPCB NAQI** — Default for locations in India

Each standard uses its own breakpoint tables and category definitions.

## Deployment

- **Frontend**: Vercel
- **Backend**: Render
- **Database**: Neon PostgreSQL

