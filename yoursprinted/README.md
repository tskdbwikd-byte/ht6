# YoursPrinted MVP

Minimal scaffold for the YoursPrinted MVP.

Includes:
- Frontend: Vite + React starter
- Backend: Firebase Functions (Express) with Stripe webhook template
- `firebase.json` template for hosting + functions

Quick start (local development):

1. Install global tools:

```bash
npm install -g firebase-tools
```

2. Frontend:

```bash
cd yoursprinted/frontend
npm install
npm run dev
```

Environment: create a `.env` in `yoursprinted/frontend` with your Firebase config keys:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_APP_ID=...
```

3. Backend (functions emulation / deploy):

```bash
cd yoursprinted/backend
npm install
# set STRIPE_SECRET and STRIPE_WEBHOOK_SECRET as env vars before deploy
firebase login
firebase init functions hosting
firebase emulators:start
```

Set the Stripe secret for local testing (example):

```bash
export STRIPE_SECRET=sk_test_...
export STRIPE_WEBHOOK_SECRET=whsec_...
```

Deployment:

1. Configure Firebase project and Stripe keys in environment.
2. `firebase deploy --only hosting,functions`

Notes:
- This is a scaffold: replace placeholders (`YOUR_STRIPE_SECRET`, service account) before production.
- File uploads use Firebase Storage from the frontend; the frontend will write order metadata to Firestore via the `POST /submit` endpoint.

Thumbnail generation:
- A storage-triggered Cloud Function (`generateThumbnail`) creates a lightweight SVG thumbnail for uploaded `.stl` and `.obj` files and saves it alongside the upload with the suffix `-thumb.svg`.

Notifications:
- A Firestore `onUpdate` function (`notifyOnOrderUpdate`) sends an email to the order's `email` when the `status` field changes. It uses SendGrid; set these env vars before running emulators or deploying:

```
export SENDGRID_API_KEY=your_sendgrid_api_key
export FROM_EMAIL="Your Name <no-reply@yoursprinted.example>"
```

In the emulator, the function will log and skip sending if `SENDGRID_API_KEY` is not set.

