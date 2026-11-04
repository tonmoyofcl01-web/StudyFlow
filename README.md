# StudyFlow — Student Productivity Platform

A full-stack student productivity application built with React, Vite, Tailwind CSS v4, Express 5, MySQL 8, JWT HTTP-only cookies, bcrypt, Zod, and Lucide React.

This archive includes the complete application source, database schema, dependency manifests, Windows setup instructions, and UI/UX fixes. It intentionally excludes `node_modules`, build output, local `.env` secrets, and machine-specific files.

## 1. Requirements

- Windows 10/11
- Node.js 22.12 or newer (use an actively supported LTS release)
- npm (installed with Node.js)
- MySQL Server 8.x
- MySQL Workbench (recommended for database setup)
- A modern browser such as Chrome or Edge

Check Node and npm from Command Prompt:

```cmd
node --version
npm --version
```

## 2. Extract the project

Extract the ZIP. The extracted folder should be named `StudyFlow` and contain:

```text
StudyFlow/
  backend/
  frontend/
  package.json
  README.md
```

Open Command Prompt or the VS Code terminal in the `StudyFlow` root folder.

Example:

```cmd
cd C:\Web_development_important\Academic\all-projects\sabuj-sir\StudyFlow
```

## 3. Create the MySQL database and application user

Open MySQL Workbench and connect using your MySQL administrator account (often `root`).

### 3.1 Create the database

Open and execute `backend/sql/00-create-database.sql`, or run:

```sql
CREATE DATABASE IF NOT EXISTS studyflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 3.2 Create or update the application user

Choose a strong password. Use the same password in `backend/.env` in the next section. Do not share it or commit it to GitHub.

For a first-time setup, run this in MySQL Workbench after replacing the example password:

```sql
CREATE USER 'studyflow_app'@'localhost' IDENTIFIED BY 'REPLACE_WITH_YOUR_OWN_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
ON studyflow.* TO 'studyflow_app'@'localhost';
FLUSH PRIVILEGES;
```

If the account already exists, use `ALTER USER` instead of `CREATE USER`:

```sql
ALTER USER 'studyflow_app'@'localhost'
IDENTIFIED BY 'REPLACE_WITH_YOUR_OWN_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
ON studyflow.* TO 'studyflow_app'@'localhost';
FLUSH PRIVILEGES;
```

Replace the placeholder with your own password before executing. Never leave `REPLACE_WITH_YOUR_OWN_PASSWORD` in a real setup. Avoid putting a real password in a project SQL file.

### 3.3 Configure the application environment

From the `StudyFlow` root folder, run:

```cmd
copy backend\.env.example backend\.env
notepad backend\.env
```

Set the values in `backend/.env`:

```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USER=studyflow_app
DB_PASSWORD=PUT_THE_DATABASE_PASSWORD_HERE
DB_NAME=studyflow
JWT_SECRET=PUT_A_RANDOM_SECRET_HERE
JWT_EXPIRES_IN=7d
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
```

Generate a private JWT secret locally with Node.js:

```cmd
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the generated value into `JWT_SECRET`. Do not send it to anyone or commit `.env` to Git. The `.gitignore` file excludes `.env` files.

For a database password with special characters, quote it in `.env`, for example `DB_PASSWORD="your-special-password"`. Do not URL-encode it when using the separate `DB_PASSWORD` setting shown above.

## 4. Install project dependencies

Run these commands from the `StudyFlow` root folder:

```cmd
npm install
npm --prefix backend install
npm --prefix frontend install
```

The backend dependencies include the patched Zod 4 line and a Minimatch override for the Nodemon dependency. The frontend uses React Router DOM 7.18.5. Keep the generated `package-lock.json` files when installing or updating dependencies.

## 5. Create the application tables

Two supported methods are available.

### Method A — MySQL Workbench

Open `backend/sql/01-schema.sql` in MySQL Workbench and execute the entire script. It creates the 11 StudyFlow tables. It uses `CREATE TABLE IF NOT EXISTS` and does not drop existing tables or data.

### Method B — Project database initialization script

After setting `backend/.env` and installing dependencies, run from the project root:

```cmd
npm --prefix backend run db:init
```

This uses the configured database user and executes `backend/sql/01-schema.sql`.

To verify the tables in MySQL Workbench:

```sql
USE studyflow;
SHOW TABLES;
```

Expected tables:

- `users`
- `subjects`
- `assignments`
- `examinations`
- `study_sessions`
- `availability_slots`
- `timetable_preferences`
- `study_goals`
- `daily_goal_progress`
- `notifications`
- `password_reset_tokens`

## 6. Start StudyFlow on Windows

Use two separate VS Code terminals or Command Prompt windows. Keep both running while using the application.

### Terminal 1 — Backend API

From the `StudyFlow` root folder:

```cmd
npm --prefix backend run dev
```

Expected startup message:

```text
StudyFlow API running at http://localhost:5000
```

### Terminal 2 — Frontend

From the `StudyFlow` root folder:

```cmd
npm --prefix frontend run dev
```

Open the local URL Vite prints. Normally it is:

```text
http://localhost:5173
```

Register your own account. No default email/password or administrator account is shipped.

To stop either server, focus its terminal and press `Ctrl + C`.

## 7. Build and test

From the `StudyFlow` root folder:

```cmd
npm run build
npm test
```

Or run the frontend build and backend tests individually:

```cmd
npm --prefix frontend run build
npm --prefix backend test
```

## 8. Main features

- User registration, login and logout using bcrypt and signed HTTP-only JWT cookies
- Dashboard overview
- Subjects, assignments and examinations
- Study sessions and Pomodoro focus timer
- Automatic timetable preview with availability, due dates, priorities, daily capacity, breaks, and locked-session preservation
- Academic calendar
- Goals and habits
- Analytics
- Notifications, mark-all-read and clear-all actions
- Profile settings and light/dark theme
- Responsive navigation and dark/light styling

## 9. Troubleshooting

### `ECONNREFUSED` or database connection error

Confirm that MySQL Server is running, the host/port are correct, and `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in `backend/.env` match the MySQL account and database.

### `Access denied for user 'studyflow_app'`

Check the password and account host. In MySQL Workbench, confirm the account exists as `'studyflow_app'@'localhost'` and has permissions on `studyflow.*`.

### Port 5000 or 5173 is already in use

Stop the old server terminal with `Ctrl + C`, or identify and stop the process using that port before restarting.

### Frontend API requests fail

Keep the backend running at `http://localhost:5000`. Confirm `CLIENT_ORIGIN=http://localhost:5173` in `backend/.env` and use the Vite URL printed in the frontend terminal.

### CSS or page still looks cached

Save the source file and hard-refresh Chrome with `Ctrl + Shift + R`. If needed, stop and restart Vite.

### npm reports dependency vulnerabilities

Run `npm audit` separately in `backend` and `frontend`. Do not use `npm audit fix --force`; it can introduce breaking major-version upgrades. Review the specific advisory and update deliberately.

## 10. Security and deployment notes

- Never share or commit `backend/.env`.
- The SQL setup file does not contain a database password. The application database account is created separately as described above.
- Development uses `COOKIE_SECURE=false` for local HTTP. Production must use HTTPS and `COOKIE_SECURE=true`.
- Password reset currently uses a development-safe token workflow. A production deployment must connect a real email provider and configure HTTPS.
- This is a local/academic project setup. Review and harden deployment, secrets, rate limits, logging, email delivery, and backups before exposing it publicly.
- Generated timetable entries are previews; review the plan before relying on it.

## 11. Existing StudyFlow installation

If you are updating an existing local installation, back up `backend/.env` first. This archive deliberately does not contain `.env`, so it will not replace your local secrets. Your existing MySQL database and user data are not included in the ZIP and are not deleted by these SQL scripts.
