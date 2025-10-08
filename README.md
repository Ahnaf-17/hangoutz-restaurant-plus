# Hangoutz Restaurant+ — Hybrid Mobile App (Assignment 2)

This repository contains a full-stack hybrid app:
- **Client**: jQuery + jQuery Mobile (Cordova-ready)
- **Server**: Node.js + Express + MongoDB Atlas (HTTPS, JWT, Routers)
- **Deployment**: Render (server), Cordova (mobile build)
- **Auth**: JWT (roles: `customer`, `staff`, `admin`)

## Features (meets spec)
- Login / Logout / Signup
- Menu browsing (GET)
- Create/Update/Delete menu items (POST/PUT/DELETE) — staff/admin
- Table bookings (POST/GET/PUT/DELETE)
- Place order, view my orders
- CORS, Helmet, rate limiting, no hard-coded credentials, routers split by feature
- Enforce HTTPS (proxy-aware)

## Directory
```
restaurant-app/
  client/
    www/
      index.html
      css/styles.css
      js/app.js
      img/
    config.xml         # Cordova project config (edit id/name as needed)
  server/
    src/
      app.js
      middleware/
        auth.js
        error.js
        httpsOnly.js
      routes/
        auth.js
        menu.js
        bookings.js
        orders.js
        users.js
      models/
        User.js
        MenuItem.js
        Booking.js
        Order.js
      utils/
        validate.js
    package.json
    .env.example
    render.yaml (example Render config)
```

## Quick Start (Local Dev)

### 1) Server
```
cd server
cp .env.example .env
# Edit .env to set MONGO_URI and JWT_SECRET
npm install
npm run dev
```
Server runs on http://localhost:8080 (proxy-aware HTTPS redirect to be handled by platform).

### 2) Client (web preview in browser)
Open `client/www/index.html` in a Live Server extension (or any static server).
Set `API_BASE` in `client/www/js/app.js` to your server URL.

### 3) MongoDB Atlas
- Create free cluster → Database → User → Connection String (MongoDB URI)
- Put it in `.env` as `MONGO_URI`

### 4) Render (server deploy)
- Create New Web Service from your GitHub repo
- Build command: `npm install`
- Start command: `node src/app.js`
- Add environment variables `MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production`
- **Render provides HTTPS termination**. Our app forces HTTPS via `httpsOnly` (honors `x-forwarded-proto`).

### 5) Cordova (optional mobile build)
```
npm install -g cordova
cd client
cordova create hangoutz com.hangoutz.app "Hangoutz Restaurant"
# Move www/ into the created project's www/ or use `cordova prepare`
cordova platform add android
cordova plugin add cordova-plugin-geolocation
cordova build android
```
> Note: You can keep this repo's `client/www/` as your source and copy it into the Cordova project's `www/` before build.

## Test Accounts (seed via API or signup)
- Default role for new users is `customer`. Use `/api/users/role` (admin only) to promote roles.
- For presentation, create a staff user and set role via MongoDB manually if needed.

## Security & Vulnerabilities (for Part B)
- JWT in Authorization Bearer; short expiry; rotate secrets for production
- Helmet for basic headers, rate limiter on auth routes
- Input validation (`express-validator`)
- CORS restricted (configure allowed origins)
- HTTPS enforced by proxy
- Known checks: missing input validation, weak JWT secret, CORS wildcard, rate limit bypass

## Scripts
- `npm run dev` — dev with nodemon
- `npm start` — production

---

© 2025 Hangoutz Restaurant+. For Assignment 2 (COIT20269).
