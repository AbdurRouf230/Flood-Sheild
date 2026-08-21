# Flood Shield

Flood Shield is a web platform for flood monitoring, incident reporting, SOS rescue, relief logistics, and role-based coordination in Bangladesh. It is built as a CSE309 project with a React frontend, an Express/MongoDB API, and a Python machine-learning service.

The GitHub repository name is `Flood-Sheild`. The product name used in the code is Flood Shield.

## What the platform does

Citizens, volunteers, NGOs, and government users share one login. After authentication, each role sees the pages it is allowed to use.

The dashboard pulls rainfall, river, and risk-style summaries for districts such as Sylhet, Sunamganj, Kurigram, Gaibandha, Netrokona, Sirajganj, Jamalpur, Bogura, Dhaka, and Chittagong. Other modules cover flood maps, incident reports, SOS alerts, volunteer slots, donations, shelters, transport, NGO campaigns, and government decision support.

The Python service scores flood likelihood with a trained XGBoost model, can run image segmentation and object detection, and answers flood-related questions through a RAG chatbot over PDF reports when those files are present.

## Repository layout

```
flood-shield/
├── flood-shield-frontend/   React + Vite UI
├── flood-shield-backend/    Express API + MongoDB
├── flood-shield-ml/         Flask ML / RAG service
├── README.md
└── .gitignore
```

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS 4, React Router, Leaflet, Recharts, Firebase Auth |
| Backend | Node.js, Express, MongoDB (Mongoose), JWT, Nodemailer |
| ML service | Flask, XGBoost, OpenCV, Ultralytics (YOLOv8), scikit-learn |
| Auth | Firebase Authentication (email/password and Google) plus MongoDB user profiles |

## User roles

Roles are stored on the MongoDB `User` document.

| Role | Typical access |
| --- | --- |
| Citizen | Dashboard, flood map, incidents, SOS, donate, volunteer hub |
| Volunteer | Same as citizen, plus transport and the rescue panel |
| NGO / NGORepresentative / NGORepLogistics | Logistics, campaigns, transport, rescue |
| Government / GovRepresentative / GovRepLogistics | Shelters, representatives, platform registry, decision support, logistics |

Role checks live in `flood-shield-frontend/src/App.jsx`. Backend routes enforce the same roles on protected APIs.

## Main frontend pages

| Path | Page | Who can open it |
| --- | --- | --- |
| `/` | Login / register | Public |
| `/dashboard` | National overview, rainfall, rivers, risk ranking | Signed-in users |
| `/flood-map` | Map of flood-related layers | Signed-in users |
| `/incidents` | Report and track incidents | Signed-in users |
| `/sos` | Send SOS with location, phone, urgency, optional photo | Signed-in users |
| `/rescue-panel` | Incoming SOS queue for responders | Volunteer, NGO, Government and representative roles |
| `/volunteers` | Volunteer applications and slots | Signed-in users |
| `/donate` | Donations | Signed-in users |
| `/logistics` | Relief inventory and allocations | NGO, Government |
| `/transport` | Vehicle / transport coordination | Volunteer, NGO, Government and representative roles |
| `/shelter-hub` | Shelter management | Government and gov representative roles |
| `/campaign-hub` | NGO / government campaigns | NGO, Government and related representative roles |
| `/representative-hub` | Field representative workflow | GovRepresentative, GovRepLogistics |
| `/platform-registry` | Registry of platform entities | Government |
| `/decision-support` | Forecast and district-risk views | Government |
| `/assistant` | AI chat assistant | Signed-in users |

## Backend API

The API listens on port `5000` by default. Health check: `GET /health`.

| Prefix | Purpose |
| --- | --- |
| `/api/auth` | Register, login profile sync, role data |
| `/api/dashboard` | Overview stats used by the home dashboard |
| `/api/flood-map` | Map data |
| `/api/incidents` | Incident CRUD |
| `/api/sos` | SOS alerts and rescue assignment |
| `/api/volunteers` | Volunteer applications and slots |
| `/api/donations` | Donation records |
| `/api/logistics` | Relief stock, requests, allocations |
| `/api/shelters` | Shelter records |
| `/api/transport` | Transport jobs |
| `/api/campaigns` | Campaigns |
| `/api/representatives` | Representative invites and field work |
| `/api/ngo-requests` | NGO requests |
| `/api/admin` | Admin operations |
| `/api/ai` | Proxy to the ML chatbot |
| `/api/decision` | Forecast and district risk (proxied to Flask) |

If MongoDB is down, the backend still starts and falls back to an in-memory store. Data from that mode is lost when the process exits.

## ML service

Flask app in `flood-shield-ml/app.py`, default port `5001`.

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Service status |
| `POST /predict` | Flood probability from location, rainfall, elevation, river distance |
| `POST /segment` | Flood region segmentation on an image |
| `POST /detect` | Object detection on an image |
| `POST /logistics/optimize-route` | Route helper for relief movement |
| `POST /logistics/predict-demand` | Demand estimate |
| `POST /ai/chat` | RAG chatbot |
| `POST /ai/reindex` | Rebuild the PDF search index |
| `GET /decision/forecast` | Forecast payload |
| `GET /decision/district-risk` | District risk payload |

The XGBoost classifier is stored as `flood-shield-ml/flood_xgb_model.json`. Features are latitude, longitude, elevation, current precipitation, 24h forecast, 72h forecast, and distance to river. `train_model.py` rebuilds that file from synthetic Bangladesh-region samples if you need to retrain.

YOLOv8 weights are not committed. Ultralytics downloads them on first detect/segment run.

RAG looks for PDFs under `explainations/pdf_reports` (relative to the `flood-shield` folder). A cache file `rag_vector_cache.json` is used when it exists.

## Prerequisites

- Node.js 18 or newer
- Python 3.10 or newer
- MongoDB running locally, or a MongoDB Atlas URI
- A Firebase project with Email/Password and Google sign-in enabled

## Local setup

Clone the repo, then run the three services in separate terminals.

```bash
git clone https://github.com/AbdurRouf230/Flood-Sheild.git
cd Flood-Sheild
```

### 1. Backend

```bash
cd flood-shield-backend
copy .env.example .env
npm install
npm run dev
```

On macOS/Linux use `cp .env.example .env` instead of `copy`.

Edit `.env`:

- `MONGO_URI` for your database
- `JWT_SECRET` to a random string
- `FIREBASE_PROJECT_ID` to match the Firebase project
- `PYTHON_ML_URL` (`http://localhost:5001` for local ML)
- `OPENROUTER_API_KEY` if you want LLM replies through OpenRouter
- `GMAIL_USER` and `GMAIL_APP_PASSWORD` only if invite emails should send

### 2. ML service

```bash
cd flood-shield-ml
copy .env.example .env
pip install -r requirements.txt
python app.py
```

### 3. Frontend

```bash
cd flood-shield-frontend
copy .env.example .env
npm install
npm run dev
```

Vite usually serves the UI at `http://localhost:5173`. Point `VITE_API_URL` at `http://localhost:5000/api`.

Firebase keys in `flood-shield-frontend/.env.example` belong to the project used during development. Replace them if you create your own Firebase app.

## Environment variables

### Frontend (`flood-shield-frontend/.env`)

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_URL=http://localhost:5000/api
```

### Backend (`flood-shield-backend/.env`)

See `flood-shield-backend/.env.example`. Never commit the real `.env` file. It can contain SMTP passwords and API keys.

### ML (`flood-shield-ml/.env`)

See `flood-shield-ml/.env.example`.

## Scripts

| Location | Command | What it does |
| --- | --- | --- |
| `flood-shield-frontend` | `npm run dev` | Vite dev server |
| `flood-shield-frontend` | `npm run build` | Production build |
| `flood-shield-backend` | `npm run dev` | API with nodemon |
| `flood-shield-backend` | `npm start` | API without nodemon |
| `flood-shield-ml` | `python app.py` | Flask ML server |
| `flood-shield-ml` | `python train_model.py` | Retrain the XGBoost model |

## Notes

- CORS on the API is open (`origin: '*'`) for local development. Tighten this before any public deployment.
- Request bodies allow up to 15mb so SOS photos can be sent as base64.
- Demo login is available from the auth page for classroom testing.

## Author

Abdur Rouf (`abdur230rouf@gmail.com`)

GitHub: [AbdurRouf230/Flood-Sheild](https://github.com/AbdurRouf230/Flood-Sheild)
