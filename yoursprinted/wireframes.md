# YoursPrinted Wireframes (MVP)

Pages:

- Landing / Home
  - Header with logo + nav (Upload, Pricing, How it Works, Sign in)
  - Hero: single-sentence value prop + CTA "Upload your file"
  - Features: Low cost, Faster queue, Student discounts
  - Footer: contact, social, campus partnerships

- Upload / Dashboard
  - If not signed in: show sign in / create account
  - Upload form: name, email (prefilled), file input, material, color, infill %, special notes
  - Estimate panel (calls `/api/estimate`)
  - Payment CTA (Stripe Checkout)
  - After payment: order details + queue position

- Admin Dashboard
  - Orders table (filter: pending, in-progress, complete)
  - Click an order to view file preview URL, set status, assign printer/ETA
  - Export CSV of orders

- How it Works
  - Short 3-step process: Upload -> Pay -> Pick-up or Delivery

Flows:

- Upload flow (user)
  1. Sign in / create account
  2. Upload file to Storage
  3. Backend estimates price
  4. User pays via Checkout
  5. Payment webhook marks order paid
  6. Admin processes order and updates status

- Admin flow
  1. View new orders
  2. Inspect file + print settings
  3. Assign to printer + set ETA
  4. Mark complete and notify user

Data model (Firestore collections):
- `orders`:
  - userId, name, email, fileName, downloadURL, estimatedPrice, status, createdAt, assignedTo, eta
- `users`:
  - displayName, email, role (user/admin), createdAt
