# College ERP - Full-Stack Architecture

A modular, production-ready College ERP application designed for comprehensive academic and institutional administration.

## System Architecture

```
College-ERP/
│
├── frontend/                     # Client application (HTML5, CSS3, JavaScript)
│   ├── public/                   # Public entry & routing (index.html)
│   ├── src/
│   │   ├── pages/                # Application views (login, dashboard, students, etc.)
│   │   ├── components/           # Reusable UI component modules
│   │   ├── css/                  # Structured CSS styles
│   │   ├── js/                   # Page logic & controller scripts
│   │   ├── services/             # API data integration layer
│   │   └── utils/                # Utilities & auth guards
│   ├── package.json
│   └── README.md
│
├── backend/                      # Backend API services (Phase 2+)
│   └── README.md
│
├── database/                     # Schema, migrations & seeders (Phase 2+)
│   └── README.md
│
├── tests/                        # Automated test suites
│   ├── frontend/
│   ├── backend/
│   └── integration/
│
├── docs/                         # System documentation
│   ├── API.md                    # REST API specifications
│   ├── DATABASE.md               # Database schema & ER diagrams
│   └── SETUP.md                  # Development setup instructions
│
├── .env.example                  # Environment configuration template
├── .gitignore                    # Version control ignore rules
├── README.md                     # Project overview
└── PHASE-1-REPORT.md             # Phase 1 Migration & Verification Report
```

## Features
- 🔐 **Authentication & Auth Guard**: Role-based access control with secure login/logout workflows.
- 📊 **Interactive Dashboard**: Real-time counter metrics for students, faculty, attendance rates, fees, and results.
- 👨‍🎓 **Student Management**: Register, edit, delete, and live-search students.
- 👨‍🏫 **Faculty Management**: Track faculty profiles, subjects taught, and contact IDs.
- 📋 **Attendance Tracking**: Dual-tab attendance marking for both students and faculty with calendar date filtering.
- 💰 **Fee Administration**: Manage student fee payments, auto-fill details, filter payment status (Paid / Pending).
- 📈 **Results & Grading**: Calculate subject scores, overall totals, percentage, and letter grades (A+, A, B, C, D, F).
- ⚙️ **System Configuration**: Customize institution branding and administrator profile names.

## Getting Started

To launch the frontend client:
1. Navigate to `frontend/public/index.html` or `frontend/src/pages/login.html` and open it in any modern browser.
2. Default credentials:
   - Email: `abhipal895@gmail.com`
   - Password: `95982536`
