# College ERP - Backend API

Production-style RESTful API backend for College ERP built with Node.js, Express.js, and MongoDB/Mongoose.

## Architecture

```
backend/
├── src/
│   ├── config/
│   │   └── database.js               # MongoDB connection with memory fallback
│   ├── controllers/
│   │   ├── authController.js         # Login, /me, JWT token generation
│   │   ├── studentController.js      # Student CRUD, search, pagination, filter
│   │   ├── teacherController.js      # Faculty CRUD, search, filter
│   │   ├── attendanceController.js   # Dual attendance, deduplication, percentage calc
│   │   ├── feeController.js          # Fees ledger, auto-pending calculation
│   │   ├── resultController.js       # Exam results, grade evaluation, report card
│   │   └── dashboardController.js    # Live database statistical aggregations
│   ├── middleware/
│   │   ├── authMiddleware.js         # JWT verification & role authorization
│   │   ├── errorMiddleware.js        # Centralized error handler & 404 handler
│   │   └── validationMiddleware.js   # Express-validator error handler
│   ├── models/
│   │   ├── User.js                   # Administrator & Faculty accounts
│   │   ├── Student.js                # Student profiles
│   │   ├── Teacher.js                # Faculty profiles
│   │   ├── Attendance.js             # Attendance records
│   │   ├── Fee.js                    # Fee invoices & payments
│   │   └── Result.js                 # Academic results & grades
│   ├── routes/                       # Express router modules
│   ├── services/
│   │   ├── seedService.js            # Initial admin seeder
│   │   └── gradeService.js           # Grade evaluation engine
│   ├── utils/
│   │   └── apiResponse.js            # Standardized API response format
│   └── server.js                     # Express app setup & route mounting
├── package.json
├── .env.example
└── README.md
```

## Prerequisites
- Node.js (v18+)
- MongoDB (local community edition or Atlas URI, with automatic in-memory fallback for local dev/testing)

## Installation & Setup

1. **Install Dependencies**:
```bash
cd backend
npm install
```

2. **Configure Environment Variables**:
Create `.env` inside `backend/` (refer to `.env.example`):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/college_erp
JWT_SECRET=super_secret_jwt_key_change_in_production_95982536
CLIENT_URL=http://localhost:5500
```

3. **Start the Backend Server**:
```bash
# Production mode
npm start

# Development mode
npm run dev
```

4. **Run Automated Test Suite**:
```bash
node ../tests/backend/test_backend.js
```

## Default Seeded Admin Credentials
- **Email:** `admin@college.erp`
- **Password:** `Password@123`
*(Alternative: `abhipal895@gmail.com` / `Password@123`)*

## API Endpoints
- Health: `GET /api/health`
- Auth: `POST /api/auth/login`, `GET /api/auth/me`
- Students: `GET /api/students`, `POST /api/students`, `GET /api/students/:id`, `PUT /api/students/:id`, `DELETE /api/students/:id`
- Teachers: `GET /api/teachers`, `POST /api/teachers`, `GET /api/teachers/:id`, `PUT /api/teachers/:id`, `DELETE /api/teachers/:id`
- Attendance: `GET /api/attendance`, `POST /api/attendance`, `PUT /api/attendance/:id`, `GET /api/attendance/student/:studentId`
- Fees: `GET /api/fees`, `POST /api/fees`, `PUT /api/fees/:id`, `GET /api/fees/student/:studentId`
- Results: `GET /api/results`, `POST /api/results`, `PUT /api/results/:id`, `GET /api/results/student/:studentId`
- Dashboard: `GET /api/dashboard/stats`
