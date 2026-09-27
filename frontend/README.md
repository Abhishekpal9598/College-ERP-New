# College ERP - Frontend

This is the frontend client for the College ERP application.

## Directory Structure

```
frontend/
├── public/
│   └── index.html             # Main entry router
├── src/
│   ├── pages/                 # HTML UI Pages
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── students.html
│   │   ├── teachers.html
│   │   ├── attendance.html
│   │   ├── fees.html
│   │   ├── results.html
│   │   └── settings.html
│   ├── components/            # Reusable UI components
│   ├── css/                   # Page stylesheets
│   ├── js/                    # Client page scripts
│   ├── services/              # API communication layer
│   └── utils/                 # Utility helpers (auth guard, formatters)
├── package.json
└── README.md
```

## Running the Frontend

You can run the frontend in any modern web browser or using a local static server:

```bash
# Option 1: Using npx serve
npx serve -l 3000 .

# Option 2: Directly open public/index.html or src/pages/login.html in any browser
```

## Default Login Credentials
- **Email:** `abhipal895@gmail.com` | **Password:** `95982536`
- **Email:** `ankushddu7983@gmail.com` | **Password:** `12345678`
