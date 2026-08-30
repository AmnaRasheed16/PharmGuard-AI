# 💊 PharmaGuard AI

### AI-Powered Pharmaceutical Cold-Chain Route Optimization & Climate Intelligence

PharmaGuard AI is an AI-powered pharmaceutical cold-chain intelligence platform developed by **Team Double Trouble** to help plan safer, climate-aware routes for temperature-sensitive pharmaceutical products.

### 👥 Team Double Trouble

- **Amna Rasheed**
- **Farah Azeem**

The platform uses real environmental intelligence from the **FortyGuard tOS Enterprise API** to analyze heat exposure, temperature conditions, worker heat stress, and other environmental risks along pharmaceutical delivery routes.

### Our Collaboration
As friends, we worked together throughout the development of PharmaGuard AI, combining our ideas, technical skills, and problem-solving to build the complete application.

The project was developed through a collaborative **frontend + backend workflow**. Rather than keeping the work completely separate, we worked together on different parts of the system and continuously integrated our changes and then pushed the code once on github.

---

# ✨ Core Features

PharmaGuard AI has **four main features** available through the sidebar:

## 1. 🗺️ Route Planning

The Route Planning module is the starting point of the application.

Users can enter:

- Starting location
- Delivery locations / stops
- Pharmaceutical cargo type
- Required temperature range
- Departure time

The system generates the route and analyzes the environmental conditions along the planned journey.

### U.S. Location Support

The application currently supports **U.S. locations** because the environmental data used by PharmaGuard comes from the FortyGuard API.

If a location outside the supported FortyGuard coverage is entered, the system will not generate fake environmental values. Instead, it displays an appropriate error indicating that FortyGuard data is unavailable.

```text
⚠️ FortyGuard Environmental Data Unavailable

Environmental data is not available for the
selected location. Please select a supported
U.S. location.

## System Architecture

```
                    USER INPUT
               Routes / Locations
                       |
                       v
              PHARMA ROUTE ENGINE
                       |
             +---------+---------+
             |                   |
             v                   v
       CARBON LENS          FORTYGUARD API
       CO2 / Carbon        Heat / Environment
             |                   |
             +---------+---------+
                       |
                       v
              AI CLIMATE AGENT
          Risk + Route Comparison
                       |
                       v
              SMART RECOMMENDATION
        "Choose Route B / Take Action"
```

The system evaluates:
1. **Micro-climate Stresses**: FortyGuard Apparent Temperature, Heat Index, AQI, and Solar Irradiance.
2. **Cold-Chain compliance**: Physics-based thermal cargo simulation comparing active/passive cooling boundaries.
3. **Worker Safety**: Wet-Bulb Globe Temperature (WBGT) indexes to trigger hydration & work-rest cycles.
4. **AI Climate Decisions**: Expert decision logic to compare multiple routes and suggest optimal departure hours.

---
Route Planning uses:

OSRM for road routing
Open-Meteo for the base temperature input
FortyGuard API for environmental intelligence

###📊 Dashboard

After planning a route, users are taken to the main PharmaGuard Dashboard.

The Dashboard provides a complete overview of the selected pharmaceutical route.

Dashboard includes:
📍 Route & Heat Exposure Map
🌡️ Temperature Exposure
🔥 Heat Exposure
👷 Worker Heat Stress
❄️ Cold-Chain Risk
🌱 Carbon Impact
📊 Pharma Risk Score
⚠️ Important Risk Indicators
Route & Heat Exposure Map

The interactive map displays:

Route path
Origin
Delivery stops
Stop-level risk
Heat exposure

The map uses an open-source map layer for visualization, while the actual environmental/heat intelligence comes from FortyGuard.

Carbon Lens

The Carbon Lens is integrated inside the Dashboard rather than being a separate feature.

It provides information about the estimated carbon impact of the planned route, allowing users to consider:

Pharmaceutical Safety + Environmental Sustainability

###🤖 AI Climate Agent

The AI Climate Agent analyzes the route and environmental information collected during route planning.

It combines:

FortyGuard environmental data
Temperature exposure
Cold-chain risk
Worker heat stress
Transit duration
Carbon impact
Pharma Risk Score

The agent compares the available route information and generates an understandable recommendation.
## Quickstart Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ (npm)

---

### 1. Environment Configuration

Create a `.env` file in the root directory (based on `.env.example`):

```bash
# FortyGuard Enterprise API Key (Authority for environmental data)
FORTYGUARD_API_KEY=your_real_api_key_here

# Backend Database URL (Defaults to SQLite for zero-setup local run)
DATABASE_URL=sqlite:///./pharmaguard.db
```

---

### 2. Backend Installation & Run

1. Open a terminal in the root folder and install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the FastAPI server using Uvicorn:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```
   The backend will be available at `http://localhost:8000`. You can inspect the Swagger docs at `http://localhost:8000/docs`.

---

### 3. Frontend Installation & Run

1. Open another terminal in the `frontend` folder:
   ```bash
   cd frontend
   ```

2. Install npm packages:
   ```bash
   npm install
   ```

3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

---

## API Credential & Settings Management
- **Live Connection Check**: The app features a live status indicator (● `FortyGuard LIVE` or 🔴 `FortyGuard API Error`) in the sidebar.
- **Dynamic Key Configuration**: You can input and update your FortyGuard API Key directly through the **Settings** tab. The key will be saved only in the backend database and is never exposed to the frontend.
- **Pharma Risk Tuning**: Sliders in the **Settings** tab let you adjust the weight distribution of individual risk factors (Temperature, Ambient Heat, Compliance, Duration, Worker Stress, Carbon).

---

## Development & Honest Failures
This application enforces **REAL-DATA ONLY** for all environmental indices.
- If the FortyGuard API key is missing or the requests fail, the application displays a clear error state: **FortyGuard API unavailable**.
- Silently falling back to fabricated or mocked temperatures is disabled by architectural design.
- The default Phoenix demo scenario runs by geocoding coordinates on OSRM and passing them directly to your live FortyGuard account.
