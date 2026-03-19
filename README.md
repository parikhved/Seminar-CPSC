# CPSC Compliance & Analytics Unit — Sprint 1

**Team 2 | BIT 4454 — Virginia Tech | Spring 2026**

Recall Prioritization System for the Consumer Product Safety Commission (CPSC). Sprint 1 establishes structured intake and prioritization of recall records so investigators can focus on the highest-risk violations.

---

## Team Members

| Name | Role |
|------|------|
| Robert Wisecarver | Data Manager |
| Nick Villarroel | Requirements Analyst |
| *(remaining team members)* | |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | FastAPI (Python 3.11+) |
| Database | Supabase (PostgreSQL) |
| Charts | Recharts |
| Icons | Lucide React |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Supabase project (free tier works)

### 1. Database (Supabase)

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Navigate to **SQL Editor**.
3. Run `database/schema.sql` (creates all 9 tables).
4. Run `database/seed.sql` (inserts seed data).
5. Copy your connection string from **Settings → Database → Connection string (URI)**.

### 2. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and set DATABASE_URL to your Supabase connection string

uvicorn main:app --reload --port 8000
```

API will be available at http://localhost:8000
Interactive docs: http://localhost:8000/docs

### 3. Frontend (React + Vite)

```bash
cd frontend
npm install

cp .env.example .env
# .env already contains: VITE_API_URL=http://localhost:8000

npm run dev
```

Frontend will be available at http://localhost:5173

**Demo login:**
- Email: `emily.carter@cpsc-sim.gov`
- Password: `demo123`

---

## Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:8000
```

---

## API Endpoint Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Manager login |
| GET | `/api/recalls` | List all recalls (paginated, searchable) |
| GET | `/api/recalls/count` | Total recall count |
| GET | `/api/recalls/{id}` | Single recall |
| GET | `/api/shortlist` | List priority shortlist |
| POST | `/api/shortlist` | Add recall to shortlist |
| PUT | `/api/shortlist/{id}` | Update shortlist entry |
| DELETE | `/api/shortlist/{id}` | Remove from shortlist |
| GET | `/api/shortlist/analytics/okr` | OKR metrics |
| GET | `/health` | Health check |

---

## Deployment

### Supabase (Database)
1. Create project at supabase.com
2. Run `database/schema.sql` in SQL Editor
3. Run `database/seed.sql` in SQL Editor
4. Copy the connection string from Settings → Database → URI

### Render (Backend)
1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variable: `DATABASE_URL` = Supabase connection string
6. Deploy and note the service URL (e.g., `https://cpsc-api.onrender.com`)

### Vercel (Frontend)
1. Go to [vercel.com](https://vercel.com) → New Project → Import GitHub repo
2. Settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add environment variable: `VITE_API_URL` = your Render backend URL
4. Deploy

### Post-Deployment
Update `backend/main.py` CORS `allow_origins` list to include your actual Vercel domain (e.g., `https://cpsc-compliance.vercel.app`). Redeploy the backend on Render.

---

## Sprint 1 Scope

**User Story:** As a CPSC Manager, I need to prioritize high priority product recalls so investigators can focus on the highest risk violations.

**OKR 1.1 — Increase High Priority Recall Shortlisting**
- Baseline: 122 shortlisted recalls/quarter
- Target: 134 (10% increase)

**OKR 1.2 — Improve Recall Prioritization Completeness**
- Baseline: 42 complete records
- Target: 50 complete records (20% relative improvement)

**Deliverables:**
1. Chart 1: High Priority Recalls Shortlisted per Quarter (baseline vs current vs target)
2. Chart 2: Percentage of Shortlisted Recalls with Complete Severity and Risk Fields
3. Email Automation: Investigator notification simulated via toast on shortlist add

---

## License

Class project — Virginia Tech BIT 4454, Spring 2026. Not for commercial use.
