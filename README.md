# Hospital Management System: QA and Testing Case Study

A MERN hospital management system branded *LifeCare* in its code ([Fairooz2150/Hospital-Management-System](https://github.com/Fairooz2150/Hospital-Management-System)) extended with 169 automated tests (unit, API integration, component and end-to-end) and a CI quality gate. The full analysis is in the accompanying report.

## Setup

**Prerequisites:** Node.js 22 and npm. Running the app also needs a MongoDB database and a Cloudinary account; the default tests need neither.

### 1. Install dependencies

```bash
git clone https://github.com/oyinda9/Hospital-Management-System-Coursework-Assessment.git
cd Hospital-Management-System-Coursework-Assessment

cd Backend && npm install && cd ..
cd Frontend-Admin && npm install && cd ..
cd Frontend-Patient && npm install && cd ..
```

### 2. Configure the backend

Create **`Backend/config/config.env`**. The backend doesn't read `.env`.

```env
PORT=4000
MONGO_URI=<your MongoDB connection string>
JWT_SECRET_KEY=<a long random secret>
JWT_EXPIRES=7d
COOKIE_EXPIRE=7
FRONTEND_ADMIN=http://localhost:5173
FRONTEND_PATIENT=http://localhost:5174
CLOUDINARY_CLOUD_NAME=<your cloud name>
CLOUDINARY_API_KEY=<your API key>
CLOUDINARY_API_SECRET=<your API secret>
```

- `PORT` must be `4000`, because both frontends call `http://localhost:4000`.
- `COOKIE_EXPIRE` (days) is required for login.
- `FRONTEND_ADMIN` and `FRONTEND_PATIENT` must match the frontend ports.

Don't commit this file.

### 3. Create the first admin

Public registration only creates patients, so create the first admin with the script, run from `Backend`:

```bash
# Bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=ChangeMe123 node scripts/createAdmin.js
```

```powershell
# PowerShell
$env:ADMIN_EMAIL="admin@example.com"; $env:ADMIN_PASSWORD="ChangeMe123"; node scripts/createAdmin.js
```

### 4. Run the application

Run each in its own terminal:

```bash
cd Backend && npm run dev                           # API: http://localhost:4000
cd Frontend-Admin && npm run dev -- --port 5173     # Admin: http://localhost:5173
cd Frontend-Patient && npm run dev -- --port 5174   # Patient: http://localhost:5174
```

## Running the tests

### Backend: 161 tests

```bash
cd Backend
npm test              # in-memory MongoDB; no config or secrets needed
npm run coverage      # same, with coverage report (Backend/coverage/) and quality gate
npm run test:real     # same tests on a temporary test_ database in your Atlas cluster (dropped afterwards)
```

### Frontend components: 6 tests

```bash
cd Frontend-Admin && npm test
cd Frontend-Patient && npm test
```

### End-to-end: 2 tests (Playwright)

```bash
cd e2e
npm install
npx playwright install chromium   # first time only
npx playwright test
```

Playwright starts a seeded backend and both frontends itself. Stop anything running on ports 4000, 5173 and 5174 first.

### Continuous integration

`.github/workflows/ci.yml` runs `npm run coverage` on every push to `main` and every pull request. The build fails if backend coverage falls below 70% statements, 50% branches, 65% functions or 70% lines.
