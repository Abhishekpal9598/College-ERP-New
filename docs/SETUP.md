# College ERP - Setup & Development Guide

## Project Overview
College ERP is an institutional management web application designed to manage students, faculty, attendance, fees, results, and system configuration.

## Directory Structure
```
College-ERP/
├── frontend/             # Frontend client application
│   ├── public/           # Public entry files
│   ├── src/              # Source code (pages, css, js, utils, components, services)
│   ├── package.json      # Frontend package configuration
│   └── README.md
├── backend/              # Future backend services
├── database/             # Database schemas & migrations
├── tests/                # Test suites (frontend, backend, integration)
├── docs/                 # System documentation
├── .env.example          # Environment variable template
├── .gitignore            # Git ignore configuration
└── README.md             # Project overview
```

## Running the Frontend (Phase 1)

### Option 1: Using Node.js / NPM
1. Open terminal in the project directory.
2. Run:
   ```bash
   cd frontend
   npx serve -l 3000 .
   ```
3. Open `http://localhost:3000/public/index.html` or `http://localhost:3000/src/pages/login.html` in your browser.

### Option 2: Direct Browser Launch
Open `frontend/public/index.html` or `frontend/src/pages/login.html` directly in Google Chrome, Microsoft Edge, or Mozilla Firefox.

### Default Login Credentials
- **Email:** `abhipal895@gmail.com`
- **Password:** `95982536`
*(Alternative: `ankushddu7983@gmail.com` / `12345678`)*
