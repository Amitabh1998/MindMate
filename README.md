# MindMate

A calm, lightweight mental-wellness web app. Users log mood with one quick interaction, see a 30-day trend, reflect with an AI assistant, and get small, actionable recommendations.

- **Frontend:** React + Vite + Tailwind  
- **Backend:** Node/Express + MongoDB (Mongoose)  
- **Auth:** JWT (Bearer)  
- **AI (optional):** LLM assistant and heuristic recommendations

> Built for an HCI course: the design emphasizes **clarity**, **visibility of system status**, **low cognitive load**, **error forgiveness**, and **accessibility** (contrast, focus, spacing, restrained motion).

## ✨ Features

- **Fast mood logging** — 5 mood chips + **solid-till-filled slider** with instant save and feedback  
- **30-day history** — a simple line graph and three plain stats (latest / best / lowest)  
- **AI Assistant** — supportive chat for reflective journaling (optional)  
- **For You** — small, context-aware action suggestions (with static fallback images)  
- **Auth** — register, login, protected routes  
- **Accessibility touches** — focus rings, adequate contrast, logical hierarchy

## 🗂️ Repository Structure

```
mindmate/
├─ client/                    # React + Vite + Tailwind
│ ├─ public/
│ │ └─ static/for-you/       # Fallback images (meditation.png, goals.png, ...)
│ └─ src/
│   ├─ components/           # Logo, ChatAssistant, etc.
│   ├─ pages/                # Login, Signup, Dashboard, Meditate, Goals, Schedule
│   └─ lib/api.ts            # API client (auth, moods, assistant, goals...)
├─ server/                    # Express + MongoDB
│ └─ src/
│   ├─ index.js              # Server bootstrap, CORS, static, routes
│   ├─ config/db.js          # Mongo connection
│   ├─ middleware/auth.js    # JWT auth
│   ├─ models/               # User, Mood, (Goal if enabled)
│   └─ routes/               # auth, moods, assistant, (goals)
├─ .gitignore
└─ README.md
```

## 🧰 Prerequisites

- **Node** 18+ (LTS recommended)  
- **MongoDB** (local or MongoDB Atlas connection string)  
- (Optional) **OpenAI API key** for assistant/image features

## 🔧 Setup (Local Development)

### 1) Clone & Install
```bash
git clone https://github.com/<your-username>/mindmate.git
cd mindmate

# Server
cd server
cp .env.example .env
# Edit .env with your values (see below)
npm install
cd ..

# Client
cd client
echo "VITE_API_URL=http://localhost:8080" > .env
npm install
cd ..
```

### 2) Environment Variables
**server/.env**
```
PORT=8080
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/mindmate?retryWrites=true&w=majority
JWT_SECRET=<use: `openssl rand -hex 32`>
CLIENT_ORIGIN=http://localhost:5173

# Optional (enable AI features)
OPENAI_API_KEY=<your-openai-key>
```

**client/.env**
```
VITE_API_URL=http://localhost:8080
```

### 3) Run (Two Terminals)
**Server**
```bash
cd server
npm run dev
# -> API on http://localhost:8080
```

**Client**
```bash
cd client
npm run dev
# -> App on http://localhost:5173
```

## ✅ Core Flows
- **Register/Login** → JWT stored in localStorage (`mm_token`)  
- **Log mood** → Slider/chip saves to `/api/moods` → Graph refreshes → Stats update  
- **30-day series** → `/api/moods/series?days=30` returns `{ dates[], values[] }` (nulls for missing days)  
- **Assistant** → `/api/assistant/chat` (non-stream) or `/api/assistant/chat/stream` (SSE) (optional)  
- **Recommendations** → `/api/assistant/recommendations` (AI + static image fallbacks)

## 📡 API (Summary)
### Auth
- `POST /api/auth/register` → `{ token, user }`  
- `POST /api/auth/login` → `{ token, user }`  
- `GET /api/auth/me` (auth) → `{ user }`

### Moods
- `POST /api/moods` (auth) → `{ ok: true }`  
  Body: `{ label: "Happy"|"Content"|"Neutral"|"Stressed"|"Sad", value: 1..5, level: 0..100 }`  
- `GET /api/moods/series?days=30` (auth) → `{ dates: string[], values: (number|null)[] }`

### Assistant (Optional; Requires `OPENAI_API_KEY`)
- `POST /api/assistant/chat` → `{ reply }`  
- `POST /api/assistant/chat/stream` → `text/event-stream` tokens  
- `POST /api/assistant/recommendations` → `{ items: [{ title, blurb, to, img? }] }`

(If you added goals, include `/api/goals` CRUD here.)

## 🧭 HCI Notes (Why the Design Looks This Way)
- **Visibility of system status** — Inline16 inline save confirmation + immediate graph update  
- **Cognitive load** — One primary chart, five chips, one slider  
- **Forgiveness** — Resilient API calls, safe defaults, no dead-ends  
- **Accessibility** — Focus indicators, adequate contrast, spacing, restrained motion  
- **Small wins** — Simple stats and doable recommendations keep users engaged

## 🖼️ Assets
Static fallback images for “For You” live under `client/public/static/for-you/`:
- `meditation.png`, `goals.png`, `checkin.png`, `energy.png`, `nutrition.png`

The server returns these URLs if AI image generation is disabled/unavailable.

## 🧪 Quick Sanity Checks
```bash
# After login, test token with:
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/auth/me

# Log a mood:
curl -X POST http://localhost:8080/api/moods \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"label":"Happy","value":4,"level":65}'
```

## 🔧 Troubleshooting
- **CORS errors** → Ensure `CLIENT_ORIGIN` matches your client URL exactly.  
- **Invalid token** → Confirm `mm_token` in localStorage; requests include `Authorization: Bearer <token>`.  
- **Mongo connect** → Verify `MONGODB_URI` (Atlas IP allowlist, db name).  
- **Tailwind not applying** → Confirm content paths in `tailwind.config.js`.  
- **Images not showing** → Ensure files exist in `client/public/static/for-you/` and paths match.
