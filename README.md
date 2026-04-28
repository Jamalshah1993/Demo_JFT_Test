# 🎌 JFT-Basic প্রস্তুতি প্ল্যাটফর্ম

> বাংলাদেশী শিক্ষার্থীদের জন্য সম্পূর্ণ JFT-Basic পরীক্ষার প্রস্তুতি সাইট।  
> Professional modular Node.js architecture — zero npm dependencies.

---

## 📁 Project Architecture

```
jft-basic-project/
│
├── server.js                    ← Entry point (pure Node.js http)
├── package.json
├── README.md
│
├── config/
│   └── config.js                ← Central config (port, auth, DB paths, exam settings)
│
├── database/
│   ├── Database.js              ← DAO abstraction (swap JSON → SQLite with no other changes)
│   ├── questions.data.js        ← Single source of truth for all exam questions
│   └── jft.db.json              ← Auto-created on first run
│
├── backend/
│   ├── middleware/
│   │   ├── auth.js              ← Token create/verify + requireAuth + optionalAuth
│   │   ├── errorHandler.js      ← Global error handler + typed error factories
│   │   └── rateLimiter.js       ← In-memory rate limiter (auth + general)
│   │
│   ├── routes/
│   │   ├── auth.routes.js       ← POST /api/auth/{register,login,logout}, GET /api/auth/me
│   │   ├── exam.routes.js       ← GET /api/exams, GET /api/exams/:id, POST /api/exams/:id/submit
│   │   └── progress.routes.js   ← GET /api/progress/dashboard, GET /api/progress/attempts/:id
│   │
│   ├── controllers/
│   │   ├── authController.js    ← Thin HTTP handlers — parse req, call service, return res
│   │   ├── examController.js
│   │   └── progressController.js
│   │
│   └── services/
│       ├── authService.js       ← Register, login, logout, profile — PBKDF2 password hashing
│       ├── examService.js       ← Exam retrieval, answer sanitisation (correct answers stripped)
│       ├── scoringService.js    ← Grading engine (scaled score 10–250, section breakdown)
│       └── progressService.js  ← Submit exam, dashboard data, attempt history
│
└── frontend/
    ├── index.html               ← SPA shell — loads all CSS + JS modules
    │
    ├── styles/
    │   ├── main.css             ← Design tokens (CSS variables), reset, typography, layout utils
    │   ├── components.css       ← Navbar, buttons, badges, forms, tabs, accordion, modal
    │   ├── exam.css             ← Exam shell, question card, options, timer, results page
    │   └── dashboard.css       ← Dashboard, auth forms, visa guide, hero section
    │
    ├── js/
    │   ├── api.js               ← HTTP client — all fetch() calls centralised here
    │   ├── auth.js              ← Auth state manager — token storage + reactive subscribers
    │   ├── router.js            ← Client-side SPA router (History API)
    │   └── utils.js             ← DOM helpers, toast notifications, formatters, theme manager
    │
    ├── components/
    │   ├── Navbar.js            ← Sticky navbar with auth-aware state
    │   ├── ExamCard.js          ← Exam list card with attempt summary
    │   └── QuestionRenderer.js  ← Question rendering (exam mode + review mode)
    │
    └── pages/
        ├── ExamPage.js          ← Full exam state machine (loading→active→submitting→done)
        ├── ResultsPage.js       ← Post-exam results with per-question Bengali feedback
        └── DashboardPage.js     ← Stats, history, 4-week study plan
```

---

## 🚀 Quick Start

```bash
# Clone / extract project
cd jft-basic-project

# Start server (no npm install needed — zero dependencies)
node server.js

# Open browser
open http://localhost:3000
```

---

## 🏗️ Architecture Decisions

### Backend: MVC + Service Layer

```
HTTP Request
    ↓
Middleware (auth, rate-limit, CORS)
    ↓
Route (maps URL → controller)
    ↓
Controller (parse req → call service → return res)
    ↓
Service (business logic — no HTTP awareness)
    ↓
Database DAO (data access — no business logic)
    ↓
JSON file / SQLite
```

**Why service layer?**  
Controllers stay thin. Business logic is testable without HTTP. Services can be reused across routes.

### Database: DAO Pattern (Swappable)

`database/Database.js` is the only file that knows about storage.  
To switch from JSON to SQLite or PostgreSQL: replace `_read()/_write()` with prepared statements.  
**No other file changes.**

```js
// Current (JSON):
_read()  { return JSON.parse(fs.readFileSync(this.dbPath)); }
_write() { fs.writeFileSync(tmp, JSON.stringify(data)); }

// With better-sqlite3 (drop-in):
const db = require('better-sqlite3')(path);
createUser(data) { return db.prepare('INSERT INTO users ...').run(data); }
```

### Frontend: Module Pattern (No Bundler)

Each JS file is a standalone module exported to `window.*`.  
Load order: `utils → api → auth → router → components → pages → bootstrap`.

**To migrate to ES Modules / Vite:**
1. Add `export` to each module
2. Add `import` at top of `index.html` bootstrap script
3. Run `vite build` — zero logic changes needed

### Security

| Concern | Implementation |
|---|---|
| Password hashing | PBKDF2-SHA512, 100k iterations, random salt |
| Timing attacks | `crypto.timingSafeEqual()` for all comparisons |
| Token signing | HMAC-SHA256, base64url encoded |
| Session management | Server-side session store (supports logout) |
| Rate limiting | Per-IP, 100 req/15min general, 10/15min auth |
| Path traversal | Static server validates paths stay within frontend dir |
| XSS | All user content escaped via `Utils.esc()` before DOM insertion |
| Answer security | Correct answers never sent to client (stripped in `examService.sanitiseQuestion`) |

---

## 📡 API Reference

### Auth
| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/api/auth/register` | — | `{ name, email, password }` |
| POST | `/api/auth/login` | — | `{ email, password }` |
| POST | `/api/auth/logout` | ✓ | — |
| GET | `/api/auth/me` | ✓ | — |

### Exams
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/api/exams` | Optional | Returns attempt summary if logged in |
| GET | `/api/exams/:examId` | — | Questions without correct answers |
| POST | `/api/exams/:examId/submit` | ✓ | `{ answers[], durationSeconds }` |

### Progress
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/api/progress/dashboard` | ✓ | Stats + history + latest per exam |
| GET | `/api/progress/attempts/:id` | ✓ | Full question-by-question breakdown |

---

## 🔧 Extending the Project

### Add a new exam
Edit `database/questions.data.js` — add an object to the `EXAMS` array.  
No other file needs to change.

### Add a new API route
1. Create controller method in `backend/controllers/`
2. Create service method in `backend/services/`
3. Add route in `backend/routes/`
4. Mount route in `server.js` (already done via `require`)

### Add a new page
1. Create `frontend/pages/MyPage.js` with `mount(container)` method
2. Add `<script src="/pages/MyPage.js">` to `index.html`
3. Add `Router.on('/my-path', () => MyPage.mount(app))` in bootstrap script

### Upgrade to Express (when ready)
```bash
npm install express
```
Replace `server.js` request handler with:
```js
const express = require('express');
const app = express();
app.use(express.json());
require('./backend/routes/auth.routes').mount(app);   // routes already work with Express
require('./backend/routes/exam.routes').mount(app);
require('./backend/routes/progress.routes').mount(app);
app.use(express.static('./frontend'));
app.listen(3000);
```

---

## 🧪 Testing Strategy

```
tests/
├── unit/
│   ├── scoringService.test.js   ← Pure function — easy to test
│   ├── authService.test.js      ← Mock DB, test password hashing
│   └── examService.test.js      ← Test sanitiseQuestion strips correct field
│
└── integration/
    ├── auth.test.js             ← Full register → login → logout cycle
    └── exam.test.js             ← Start exam → submit → check result
```

Run with Node's built-in test runner (Node 18+):
```bash
node --test tests/**/*.test.js
```

---

## 📈 Scaling Path

```
Current:  JSON file DB  →  Single process  →  No bundler
Step 1:   SQLite (replace Database.js _read/_write)
Step 2:   PostgreSQL (replace Database.js with pg adapter)
Step 3:   Add Redis for sessions and rate limiting
Step 4:   Add Vite bundler (no JS logic changes)
Step 5:   Deploy to Railway / Render / VPS
```

---

*এটি তথ্যভিত্তিক গাইড। অফিসিয়াল JFT সিদ্ধান্ত জাপান ফাউন্ডেশন ও ইমিগ্রেশন কর্তৃপক্ষ নেবে।*
