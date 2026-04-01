# 🎬 GrubX

A modern full-stack web app for discovering and watching movies and TV shows. Built with a focus on performance, clean UI, and a personalized user experience.

---

## 🚧 Status

This project is currently in **Early Access (Pre-Release)**.
Core features are functional, but the app is still under active development.

* ✅ Desktop: Fully supported
* ⚠️ Tablet: Partially supported
* ⚠️ Mobile: Minimally usable

---

## ✨ Features

* 🔍 Search movies and TV shows
* 🎞 Browse trending and categorized media
* ▶️ Watch trailers and playback content
* 📺 Continue Watching tracking
* ⭐ Watchlist system
* 👤 Authentication & session management
* ⚙️ User settings & preferences
* ⚡ Real-time updates via subscriptions

---

## 🛠 Tech Stack

* **Frontend:** Next.js (App Router), React, TypeScript
* **Backend:** Next.js API Routes
* **Database:** Firebase Firestore
* **Auth:** Firebase + Matrix bridge
* **Media Data:** TMDB API
* **Styling:** CSS + custom UI components

---

## 📁 Project Structure

```bash
.
├── app/                    # App Router (pages, layouts, API routes)
│   ├── api/                # Server-side API routes
│   │   └── auth/matrix/    # Matrix auth bridge endpoint
│   └── (routes)/           # Application pages
│
├── components/             # Reusable UI components
│   ├── media/              # Media-related UI (cards, player, rows)
│   ├── shell/              # Layout (Navbar, Footer, AppShell)
│   ├── user/               # User-specific UI (watchlist, continue watching)
│   └── settings/           # Settings UI
│
├── context/                # React context providers
│   ├── SessionContext.tsx
│   └── SettingsContext.tsx
│
├── hooks/                  # Custom React hooks
│   ├── useInfiniteMedia.ts
│   ├── useWatchlistSubscription.ts
│   └── ...
│
├── lib/                    # Core logic & services
│   ├── auth/               # Authentication logic (Matrix bridge)
│   ├── firebase/           # Firebase admin & client setup
│   ├── tmdb/               # TMDB API client (server + client)
│   ├── dataLayer.ts        # Data abstraction layer
│   └── env.ts              # Environment config
│
├── public/                 # Static assets (icons, manifest, OG image)
├── styles/                 # Global and custom styles
├── types/                  # TypeScript type definitions
│
├── firestore.rules         # Firestore security rules
├── firebase.json           # Firebase config
├── next.config.ts          # Next.js config
└── package.json
```

---

## 🔌 API & Server

This app uses **Next.js server routes** for backend functionality:

### Auth API

* `app/api/auth/matrix/bridge/route.ts`

  * Handles authentication via Matrix bridge
  * Connects external auth flow to Firebase sessions

### Server Utilities

* `lib/firebase/admin.ts` → Firebase Admin SDK (server-side)
* `lib/tmdb/server.ts` → Server-side TMDB requests
* `lib/auth/matrixBridge.ts` → Matrix authentication logic

---

## ▶️ Getting Started

### Install dependencies

```bash
pnpm install
```

### Run development server

```bash
pnpm dev
```

### Build for production

```bash
pnpm build
pnpm start
```

---

## 📜 Scripts

```bash
pnpm dev        # Start dev server
pnpm build      # Build app
pnpm start      # Run production server
```

---

## 🧪 Notes

* Mobile UI is still under heavy development
* Some features may be incomplete or unstable
* Data persistence edge cases may exist

---

## 📢 Feedback

Found a bug or have a suggestion?
Open an issue or contribute to the project.

---

## 📈 Changelog

Full commit history:
https://github.com/SRGuyYT/grubedX/commits/

---

## 📄 License

MIT License

---

## 🙌 Credits

* TMDB for media data
* Firebase for backend services
* Built with Next.js
