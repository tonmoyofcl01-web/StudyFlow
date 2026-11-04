# StudyFlow Verification Notes

This verification report applies to the full project archive packaged on 2026-11-04.

## Checks completed in the packaging environment

- All 18 frontend JavaScript/JSX source files passed a TypeScript transpilation syntax check.
- All backend JavaScript files, scripts, tests, and frontend `.js` files passed `node --check`.
- `frontend/src/index.css` passed a PostCSS parse check.
- Root, backend, and frontend `package.json` files passed JSON parsing.
- Backend timetable unit tests: 6 passed, 0 failed.
- Final ZIP archive integrity and file list were checked.
- The archive was checked to ensure it does not contain a real `.env`, `node_modules`, or frontend `dist` directory.

## Checks not completed in the packaging environment

- Full Vite production build for the final merged UI/UX files.
- Live backend startup against a running MySQL instance.
- MySQL schema import against an actual MySQL server.
- Browser end-to-end tests for registration, login, CRUD operations, theme switching, notifications, and timetable generation.
- `npm audit` against a freshly resolved lockfile.

The npm registry was unavailable/timed out while attempting to generate fresh dependency lockfiles in the packaging environment. Therefore package lockfiles are not included. Run the install commands in `INSTALL.txt` on your Windows computer; npm will create local lockfiles. The dependency versions in the manifests include the updates the user locally verified: Zod 4.6.7, Nodemon 3.1.14 with a Minimatch 11 override, and React Router DOM 7.18.5.

## Expected local verification

From the project root after dependencies are installed and `.env` and MySQL are configured:

```cmd
npm run build
npm test
```

For dependency audit, run separately:

```cmd
npm --prefix backend audit
npm --prefix frontend audit
```

Do not use `npm audit fix --force` as a generic repair command; it may introduce breaking major-version upgrades.
