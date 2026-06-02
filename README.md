# 🏙️ CivicReport — Crowdsourced Civic Issue Reporting System

A full-stack MVP for reporting, tracking, and resolving civic issues with map visualization and admin management.

---

## 🧩 Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React (Vite), Tailwind CSS, React Router, Axios, Leaflet |
| Backend   | Node.js, Express, MongoDB (Mongoose) |
| Auth      | JWT |
| Images    | Cloudinary |

---

## 📁 Project Structure

```
civic-report/
├── server/                  # Express backend
│   ├── config/
│   │   ├── db.js            # MongoDB connection
│   │   └── cloudinary.js    # Cloudinary + Multer setup
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── reportController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   ├── auth.js          # JWT protect / adminOnly
│   │   ├── errorHandler.js  # Global error handler
│   │   └── validate.js      # Express-validator rules
│   ├── models/
│   │   ├── User.js
│   │   ├── Report.js
│   │   └── Comment.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── reports.js
│   │   ├── admin.js
│   │   └── users.js
│   ├── index.js             # Server entry
│   ├── .env.example
│   └── package.json
│
└── client/                  # React frontend
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── IssueCard.jsx
    │   │   ├── MapComponent.jsx
    │   │   ├── StatusBadge.jsx
    │   │   └── LoadingSpinner.jsx
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── SignupPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── ReportIssuePage.jsx
    │   │   ├── MapViewPage.jsx
    │   │   ├── ReportDetailPage.jsx
    │   │   ├── AdminPage.jsx
    │   │   └── ProfilePage.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── services/
    │   │   ├── api.js
    │   │   └── reports.js
    │   ├── utils/
    │   │   └── helpers.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## ⚙️ Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- Cloudinary account (free tier works)

---

## 🚀 Setup & Run

### 1. Clone / Copy project

```bash
cd civic-report
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create `.env` from example:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/civic_report
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRE=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

NODE_ENV=development
```

Start backend:

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Backend runs at: **http://localhost:5000**

---

### 3. Frontend Setup

```bash
cd ../client
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 🔑 First-Time Login / Admin Setup

You can log in as a dedicated admin by setting these values in `server/.env` before starting the server:

```env
ADMIN_NAME=Government Admin
ADMIN_EMAIL=admin@civicreport.local
ADMIN_PASSWORD=Govt@123
```

When the server starts, it will seed that account if it does not already exist.

> **Important:** this seeded account is the only admin. All other users register as regular citizens.

1. Open http://localhost:5173
2. Click "Create one" → Sign up
3. Sign in with the seeded admin account to access the Admin panel at `/admin`

All subsequent users will be regular users.

---

## 📡 API Endpoints

### Auth
| Method | Route              | Auth     | Description        |
|--------|-------------------|----------|--------------------|
| POST   | /api/auth/register | Public   | Register user      |
| POST   | /api/auth/login    | Public   | Login              |
| GET    | /api/auth/me       | JWT      | Get current user   |

### Reports
| Method | Route                      | Auth      | Description        |
|--------|---------------------------|-----------|-------------------|
| GET    | /api/reports               | Optional  | List all reports  |
| GET    | /api/reports/:id           | Optional  | Get single report |
| POST   | /api/reports               | JWT       | Create report     |
| PATCH  | /api/reports/:id/status    | Admin     | Update status     |
| POST   | /api/reports/:id/upvote    | JWT       | Toggle upvote     |
| POST   | /api/reports/:id/comment   | JWT       | Add comment       |
| DELETE | /api/reports/:id           | JWT       | Delete report     |

### Admin
| Method | Route                          | Auth  | Description         |
|--------|-------------------------------|-------|---------------------|
| GET    | /api/admin/analytics           | Admin | Dashboard stats     |
| GET    | /api/admin/reports             | Admin | All reports (table) |
| GET    | /api/admin/users               | Admin | User list           |
| PATCH  | /api/admin/users/:id/toggle    | Admin | Toggle user active  |

---

## 🎯 Features

### User
- ✅ Register / Login with JWT
- ✅ Submit issue with image upload (Cloudinary), location (map click or GPS detect)
- ✅ View all issues on interactive Leaflet map
- ✅ Filter by status and category
- ✅ Track issue status: Submitted → In Progress → Resolved
- ✅ Upvote / un-upvote issues
- ✅ Comment on issues
- ✅ View own profile and submitted reports

### Admin
- ✅ Dashboard with analytics (totals, resolution rate, category & status charts)
- ✅ View and search all reports
- ✅ Quick status update from table
- ✅ Full status update with admin notes from detail page
- ✅ User management

### System
- ✅ Cloudinary image upload (up to 5 images per report)
- ✅ Auto category detection from title/description keywords
- ✅ JWT middleware with role-based access
- ✅ Centralized error handling
- ✅ Input validation (express-validator)
- ✅ 2dsphere geospatial index on reports
- ✅ Toast notifications
- ✅ Loading states throughout
- ✅ Responsive design (mobile-first)

---

## 🌍 Map Features

- Dark map tiles (CartoDB Dark Matter)
- Color-coded markers by status (blue/amber/green/red)
- Click marker → popup with issue details + link
- Filter visible markers by status / category
- Click anywhere on map to set location when reporting
- GPS auto-detect button

---

## 🛠️ Troubleshooting

**MongoDB connection error:**
- Ensure MongoDB is running: `mongod --dbpath /data/db`
- Or use MongoDB Atlas free cluster

**Cloudinary upload fails:**
- Check credentials in `.env`
- Images are optional — reports can be submitted without them

**Map not loading:**
- Leaflet CSS is loaded via CDN in `index.html`
- Check browser console for CORS errors

**Port conflicts:**
- Backend default: 5000 (change `PORT` in `.env`)
- Frontend default: 5173 (change in `vite.config.js`)
