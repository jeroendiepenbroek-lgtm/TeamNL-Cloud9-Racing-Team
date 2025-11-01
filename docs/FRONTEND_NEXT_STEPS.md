Frontend next steps

1. Fill `frontend/src/firebase.ts` with your Firebase web config (from Firebase console -> Project settings -> SDK snippet).
2. Run `npm ci` in `frontend/` and `npm run dev` to start the dev server.
3. Implement components to match zwiftracingcloud9.web.app layout and styles. Use Tailwind or plain CSS.
4. Add authentication (optional) for admin pages.
5. Wire admin pages to backend API endpoints (create/delete riders) via authenticated calls.
6. Deploy using GitHub Actions; add `FIREBASE_TOKEN` secret.
