# CPSC Compliance & Analytics Unit — Sprint 2

**Team 2 | BIT 4454 — Virginia Tech | Spring 2026**

Recall Prioritization System for the Consumer Product Safety Commission (CPSC). The current MVP supports recall review, shortlist-based eBay marketplace scanning, violation list management, violation logging, reporting, and seller notification workflows.

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
5. If you already have an existing database from the earlier MVP, run `database/migrations/2026-04-08_sprint2_sync.sql` instead of resetting everything. You can also run the three individual Sprint 2 migration files if you prefer.
6. Copy your connection string from **Settings → Database → Connection string (URI)**.

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
- Investigator Email: `daniel.kim@cpsc-investigator.gov`
- Password: `demo123`
- Seller Email: `priya.shah@gmail.com`
- Password: `demo123`

---

## Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
FRONTEND_URL=http://localhost:5173

EBAY_ENV=production
EBAY_MARKETPLACE_ID=EBAY_US
EBAY_CLIENT_ID=your-ebay-client-id
EBAY_CLIENT_SECRET=your-ebay-client-secret

SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=no-reply@cpsc.gov
SMTP_USE_TLS=true
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:8000
```

---

## API Endpoint Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Manager or investigator login |
| GET | `/api/recalls` | List all recalls (paginated, searchable) |
| GET | `/api/recalls/count` | Total recall count |
| GET | `/api/recalls/{id}` | Single recall |
| GET | `/api/shortlist` | List priority shortlist |
| POST | `/api/shortlist` | Add recall to shortlist |
| PUT | `/api/shortlist/{id}` | Update shortlist entry |
| DELETE | `/api/shortlist/{id}` | Remove from shortlist |
| GET | `/api/shortlist/analytics/okr` | OKR metrics |
| GET | `/api/violations` | List logged violations |
| POST | `/api/violations/search-shortlist` | Search all shortlisted products against eBay and insert new violations |
| POST | `/api/violations/scan-ebay` | Search eBay listings for a recall |
| POST | `/api/violations` | Log a violation and send seller notification |
| PUT | `/api/violations/{id}` | Edit match confirmation, description, and status |
| DELETE | `/api/violations/{id}` | Delete a resolved violation |
| GET | `/api/analytics/violations-overview` | New-violations, documentation, and resolution analytics |
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

## Sprint 2 Scope

**Current MVP User Story:** As a CPSC Investigator, I need to identify recalled products in online marketplaces and log violations so unsafe products can be removed.

**Investigator Workflow:**
1. Log In
2. Investigator Dashboard
3. View Assigned Recall
4. Compare Recall vs Marketplace Listings
5. Search the Violation List for current marketplace matches
6. Edit violation status and documentation
7. Use the logging workspace when seller notification is required

**Seller Workflow:**
1. Log In
2. View Violation Notice
3. Submit Response + Evidence

**OKR 1.1 — Increase High Priority Recall Shortlisting**
- Baseline: 122 shortlisted recalls/quarter
- Target: 134 (10% increase)

**OKR 1.2 — Improve Recall Prioritization Completeness**
- Baseline: 42 complete records
- Target: 50 complete records (20% relative improvement)

**Deliverables:**
1. eBay listing comparison against recalled products
2. Investigator dashboard and assigned recall workflow
3. Violation List page connected to the database
4. Validation for required violation fields before insertion
5. Seller email notification after logging
6. Reporting view of logged violations
7. Seller notice and response workflow

**Implementation Note:** eBay Browse API powers marketplace search and listing retrieval. Seller email is not returned by that API, so the investigator supplies or maps the seller email inside the violation logging flow before notification is sent.

**Testing Note:** eBay Sandbox sample data and the current 3-5 violation detection test cases are documented in [docs/violation-detection-test-cases.md](docs/violation-detection-test-cases.md).

---

## License

Class project — Virginia Tech BIT 4454, Spring 2026. Not for commercial use.
