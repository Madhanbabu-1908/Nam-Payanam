# 🗺️ Nam Payanam (நம் பயணம்) v2.0
### *Your Comprehensive AI-Powered Trip Planning Friend*
### *ஒரு மேம்படுத்தப்பட்ட பயண நண்பன்*

---

## 📖 What is Nam Payanam?

Nam Payanam is a **mobile-first web application** that helps groups plan trips together — from AI-generated itineraries and real road distance calculations, to live GPS tracking, expense splitting, and downloadable reports.

**No login required. No personal data collected. Just a nickname.**

---

## 🗺️ System Architecture Flowchart

```
┌─────────────────────────────────────────────────────────┐
│                    USER DEVICE (Browser)                 │
│                                                         │
│  React + Vite + Tailwind  →  Vercel CDN                │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ HomePage │  │ Create   │  │ Trip     │  │ Join   │ │
│  │(My Trips)│  │ Trip     │  │Dashboard │  │ View   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │             │             │             │       │
│       └─────────────┴─────────────┴─────────────┘       │
│                           │                             │
│                     Axios HTTP calls                    │
└───────────────────────────┼─────────────────────────────┘
                            │ HTTPS
                ┌───────────▼───────────┐
                │   Node.js + Express   │  ← Render.com
                │       Backend         │
                │                       │
                │  ┌─────────────────┐  │
                │  │  Rate Limiter   │  │
                │  │  CORS Guard     │  │
                │  │  Helmet (sec)   │  │
                │  └────────┬────────┘  │
                │           │           │
                │  ┌────────▼────────┐  │
                │  │   API Routes    │  │
                │  │  /api/trips     │  │
                │  │  /api/expenses  │  │
                │  │  /api/breaks    │  │
                │  │  /api/ai        │  │
                │  └────────┬────────┘  │
                │           │           │
                │  ┌────────▼────────┐  │
                │  │   Controllers   │  │
                │  │  tripCtrl       │  │
                │  │  expenseCtrl    │  │
                │  │  breakCtrl      │  │
                │  │  aiCtrl         │  │
                │  └────────┬────────┘  │
                │           │           │
                │  ┌────────▼────────┐  │
                │  │    Services     │  │
                │  │  groqService    │  │  → Groq API
                │  │  routeService   │  │  → OSRM + Nominatim
                │  │  weatherService │  │  → Open-Meteo
                │  └────────┬────────┘  │
                └───────────┼───────────┘
                            │
                ┌───────────▼───────────┐
                │      Supabase         │  ← Supabase.com
                │   PostgreSQL + RT     │
                │                       │
                │  trips                │
                │  trip_members         │
                │  trip_days            │
                │  expenses             │
                │  trip_breaks          │
                │  trip_announcements   │
                │  session_trips        │
                │  user_sessions        │
                └───────────────────────┘
```

---

## 🌊 User Journey Flowchart

```
ORGANISER FLOW:
═══════════════
Home Page
    │
    ▼
[Plan New Trip]
    │
    ├── Enter: Name, Title, Route, Dates, Group Size
    │
    ├── Location Search → Nominatim Autocomplete ──→ Get lat/lng
    │
    ├── [Calculate Route] → OSRM → Real km + drive time
    │
    ├── Fuel Estimator → mileage × petrol price → cost/person
    │
    ├── Choose: AI Plan OR Manual Plan
    │         │                  │
    │    [AI Mode]          [Manual Mode]
    │         │                  │
    │    5 Preference         Build days
    │    Questions            manually
    │         │
    │    Groq AI generates
    │    3 plans (with OSRM data)
    │         │
    │    Select 1 plan
    │
    ├── Create Trip → 6-char Trip Code generated
    │
    ├── Trip saved in DB + session linked
    │
    ▼
Trip Dashboard ──────────────────────────────────────────┐
    │                                                     │
    ├──[Plan Tab]          Day 0,1,2... tabs              │
    │    Stop timeline, weather, budget per day           │
    │    Organiser: Start/End trip, Mark stops            │
    │                                                     │
    ├──[Expenses Tab]      Add/edit expenses              │
    │    Equal or manual split among members              │
    │    Settlement calculator (min transactions)         │
    │    Downloadable report                              │
    │                                                     │
    ├──[Breaks Tab]        Log food/fuel/rest stops       │
    │    Check-in/out time, duration tracking             │
    │    Any member can add breaks                        │
    │                                                     │
    ├──[Map Tab]           OpenStreetMap + OSRM route     │
    │    Live GPS tracking (browser geolocation)          │
    │    Speed indicator, ETA to next stop                │
    │    RedBus-style vehicle icon                        │
    │                                                     │
    └──[AI Tab]            Groq AI travel assistant       │
         Ask questions about the trip                     │
         Smart fallback: 4 models                         │
                                                          │
    Delete Trip ──→ Double confirmation ──→ Hard delete ──┘

MEMBER FLOW:
════════════
Receive Code/Link
    │
    ▼
Enter nickname (no personal info!)
    │
    ▼
Session ID created → linked in DB
    │
    ▼
Full trip dashboard access (same as organiser, except:
  - Cannot start/end trip
  - Cannot remove members
  - Cannot delete trip
  - CAN add expenses, breaks)
    │
    ▼
My Trips page shows this trip forever
(until trip deleted or browser cleared)
```

---

## 🧠 AI Model Fallback Flowchart

```
User requests AI plan / chat
          │
          ▼
    Try Model 1:
  llama-3.3-70b-versatile
  (Best quality, detailed plans)
          │
     Success? ──YES──→ Return response
          │
         NO (429 Rate Limited)
          │
    Set 90s cooldown on Model 1
          │
          ▼
    Try Model 2:
  llama-3.1-70b-versatile
  (Still high quality)
          │
     Success? ──YES──→ Return response
          │
         NO (429)
          │
    Set 90s cooldown on Model 2
          │
          ▼
    Try Model 3:
  llama-3.1-8b-instant
  (Fast, less detail)
          │
     Success? ──YES──→ Return response
          │
         NO (429)
          │
          ▼
    Try Model 4:
    gemma2-9b-it
  (Final fallback)
          │
     Success? ──YES──→ Return response
          │
         NO
          │
          ▼
  Return user-friendly error
"AI is busy. Try in a minute."

NOTE: User never sees model names.
      All fallbacks are invisible.
```

---

## 🏗️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Vite | Fast, mobile-optimized |
| Styling | Tailwind CSS | Utility-first, consistent |
| State | Zustand (persisted) | Simple, no boilerplate |
| Backend | Node.js + Express | Lightweight, fast |
| AI | Groq API (4 models) | Free tier, very fast inference |
| Database | Supabase (PostgreSQL) | Realtime, free tier |
| Maps | OpenStreetMap + Leaflet | Fully free |
| Routing | OSRM Public API | Real road distances |
| Geocoding | Nominatim | Free, no API key |
| Weather | Open-Meteo | Free, no API key |
| Frontend Host | Vercel | Free, global CDN |
| Backend Host | Render | Free tier |

---

## 📁 Project Structure

```
nam-payanam/
├── backend/
│   ├── controllers/
│   │   ├── tripController.js     ← Trip CRUD, My Trips, Delete
│   │   ├── expenseController.js  ← Expenses, Settlements, Report
│   │   ├── breakController.js    ← Break entries
│   │   └── aiController.js       ← AI chat + insights
│   ├── services/
│   │   ├── groqService.js        ← 4-model AI with smart fallback
│   │   ├── routeService.js       ← Nominatim + OSRM
│   │   └── weatherService.js     ← Open-Meteo
│   ├── db/
│   │   ├── supabase.js
│   │   └── schema.sql            ← Run this in Supabase SQL Editor
│   ├── routes/index.js
│   └── server.js
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── HomePage.jsx       ← My Trips + Create/Join
        │   ├── CreateTripPage.jsx ← AI plans + Manual plan
        │   └── TripDashboard.jsx  ← Main hub (5 tabs)
        ├── components/
        │   ├── trip/
        │   │   ├── ItineraryTab.jsx    ← Day plan, weather
        │   │   ├── ExpensesTab.jsx     ← Add/split expenses
        │   │   ├── BreaksTab.jsx       ← Stop entries
        │   │   ├── MapTab.jsx          ← Live GPS + OSRM route
        │   │   ├── SettlementsView.jsx ← Who owes whom
        │   │   ├── TripReport.jsx      ← Downloadable report
        │   │   ├── MembersPanel.jsx    ← Manage members
        │   │   └── AnnouncementBanner.jsx
        │   ├── location/
        │   │   └── LocationSearch.jsx ← Nominatim autocomplete
        │   ├── ai/
        │   │   └── AIAssistant.jsx    ← Chat with AI
        │   └── ui/index.jsx           ← Design system
        ├── store/tripStore.js          ← Zustand (never auto-clears)
        └── utils/
            ├── api.js
            ├── session.js             ← Anonymous UUID session
            └── supabase.js
```

---

## 🚀 Setup (5 steps)

### Step 1: Supabase
1. Create project at [supabase.com](https://supabase.com)
2. SQL Editor → paste `backend/db/schema.sql` → Run
3. Settings → API → copy URL, service_role key, anon key

### Step 2: Groq
1. [console.groq.com](https://console.groq.com) → Create API key
2. Save as `GROQ_API_KEY`

### Step 3: Backend on Render
```
Build:  npm install
Start:  node server.js

Environment variables:
  GROQ_API_KEY=gsk_...
  SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_SERVICE_KEY=eyJ...
  FRONTEND_URL=https://nam-payanam.vercel.app
  NODE_ENV=production
```

### Step 4: Frontend on Vercel
```
Framework: Vite

Environment variables:
  VITE_API_URL=https://nam-payanam.onrender.com/api
  VITE_SUPABASE_URL=https://xxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ...
```

### Step 5: Test
- Visit `https://nam-payanam.onrender.com/health` → should show `{"status":"ok"}`
- Visit your Vercel URL → create a trip!

---

## 🔑 Key Concepts Explained

### Anonymous Sessions
Instead of login, we generate a random UUID (`sessionId`) stored in localStorage.
When you create/join a trip, we save `{sessionId, tripId, nickname}` in Supabase.
Next time you visit, we fetch trips linked to your sessionId → "My Trips".

### Minimum Transaction Settlement Algorithm
Problem: 4 people spent different amounts. Who pays whom?
Solution: Build a "balance" per person (what they paid minus their share).
Then use a greedy algorithm to find the minimum number of transactions.
Example: A pays B ₹200, C pays D ₹150 → settled in just 2 transactions.

### OSRM Routing
OSRM (Open Source Routing Machine) is a free routing engine.
1. We geocode place names → lat/lng using Nominatim
2. We send lat/lng pairs to OSRM's public API
3. OSRM returns: real road distance, drive time, turn-by-turn instructions
4. We feed this real data to the AI → accurate cost estimates

### 4-Model AI Fallback
Groq has rate limits per model. When a model hits its limit (HTTP 429),
we instantly try the next model. Each failed model gets a 90-second cooldown.
The user only sees "Generating..." — never knows which model is running.

---

## 📱 Features Summary

| Feature | How it works |
|---|---|
| Location search | Nominatim autocomplete (like Google Maps) |
| Real distances | OSRM public API — actual road routes |
| AI plans | Groq LLaMA 3.3 70B with real route data |
| AI fallback | 4-model chain, silent switching |
| My Trips | sessionId UUID → Supabase session_trips table |
| Manual plan | Skip AI, build day-by-day yourself |
| Trip delete | Double confirmation → hard delete all DB data |
| Break entries | Any member, check-in/out time, 9 types |
| Live GPS | Browser Geolocation API → updates map + DB |
| Vehicle icon | Custom Leaflet div icon, moves with GPS |
| Speed & ETA | Calculated from GPS position delta + OSRM distance |
| Expense splits | Equal or manual per-member allocation |
| Settlements | Minimum transaction greedy algorithm |
| Weather | Open-Meteo API per stop per day |
| Announcements | Organiser posts → all members see |
| Report | Day-wise + per-person + category breakdown + download |
| Realtime sync | Supabase Realtime subscriptions |
| PWA | Installable on phone home screen |

---

*Built with ❤️ for Indian travellers*
*நம் பயணம் — உங்கள் பயண நண்பன்*
