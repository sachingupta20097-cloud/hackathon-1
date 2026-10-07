# SmartFlow AI 🚀

Enterprise AI-powered employee request routing, policy evaluation, and managerial approval platform. Powered by **Google Gemini 3.8 Flash**, **Supabase PostgreSQL**, **Node.js/Express**, and **React 19 + Vite + Tailwind CSS**.

---

## 🌟 Key Features

- **AI-Powered Natural Language Intake**: Submit unstructured employee requests (IT equipment, business travel, leave requests, office supplies). Gemini extracts parameters, dates, costs, justification, and confidence scoring.
- **Dynamic Policy & Rule Engine**: Evaluates limits, thresholds, and conditions to auto-approve, route to approvers, or flag for escalation.
- **Interactive Multi-Level Approvals**: Fast-track, reject, request additional information, or escalate with full managerial comment threads.
- **Immutable PostgreSQL Audit Trail**: Complete timeline history tracking every state transition, rule match, and action.
- **Enterprise Role-Based Access Control**: Instant persona switching between Employee, Approver, and Administrator.

---

## 🏗️ Architecture & Project Structure

```
smartflow-ai/
├── client/                 # React 19 + TypeScript + Vite + Tailwind CSS frontend
│   ├── src/
│   │   ├── components/     # UI components (IntakeForm, ApprovalModal, Timeline, etc.)
│   │   ├── context/        # Auth & Role context
│   │   ├── pages/          # App views (Dashboard, Intake, Approvals, Rules, Categories, Logs)
│   │   └── lib/            # Supabase client & API utilities
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Express + TypeScript backend API
│   ├── src/
│   │   ├── config/         # Supabase & Gemini SDK configurations
│   │   ├── db/             # Data repository & live seeding scripts
│   │   ├── middleware/     # Auth & rate-limiting middleware
│   │   ├── routes/         # API endpoints (/api/requests, /api/approvals, /api/admin)
│   │   └── services/       # AI extraction & workflow rules engine
│   ├── package.json
│   └── tsconfig.json
├── shared/                 # Shared TypeScript interfaces & Zod validation schemas
│   └── schemas.ts
├── supabase/
│   └── schema.sql          # Complete PostgreSQL schema, RLS policies, & initial seeds
└── package.json            # Root workspace configuration
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)

### 2. Setup Environment Variables
Copy the `.env.example` templates to `.env` in both `server/` and `client/`:

**`server/.env`:**
```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>
SUPABASE_ANON_KEY=<your_supabase_anon_key>
GEMINI_API_KEY=<your_gemini_api_key>
GEMINI_MODEL=gemini-3.8-flash
```

**`client/.env`:**
```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Database Setup (Supabase PostgreSQL)
1. Open your Supabase project's **SQL Editor**.
2. Run the SQL statements found in `supabase/schema.sql`.
3. *(Optional)* Seed initial demo data:
   ```bash
   cd server
   npx tsx src/db/seedDatabase.ts
   ```

### 4. Running the Development Stack
From the root directory:
```bash
# Start backend server (http://localhost:5000)
npm run server:dev

# Start frontend application (http://localhost:5173)
npm run client:dev
```

---

## 👥 Demo Personas

| Persona | Email | Role | Department |
| :--- | :--- | :--- | :--- |
| **Alex Rivera** | `alex.employee@company.com` | `EMPLOYEE` | Engineering |
| **Sarah Chen** | `sarah.manager@company.com` | `APPROVER` | Engineering & Operations |
| **Marcus Vance** | `marcus.admin@company.com` | `ADMIN` | Workplace & IT Admin |
