# Sheets — Real-time Collaborative Spreadsheet

A lightweight, real-time collaborative spreadsheet built with Next.js 15 (App Router), TypeScript, Tailwind CSS, and Firebase.

**Live Demo:** [https://your-app.vercel.app](https://sheets-peach.vercel.app/)

---

## Features

### Core
- **Document Dashboard** — list of documents with title, last modified, and owner
- **Spreadsheet Editor** — 26 × 100 scrollable grid, rows numbered, columns lettered
- **Formula Engine** — hand-written recursive descent parser supporting:
  - Arithmetic: `=A1+B2*3-(C4/2)`
  - Cell references: `=A1`, `=B10`
  - Ranges: `=A1:A10` (inside functions)
  - Functions: `SUM`, `AVERAGE`, `COUNT`, `COUNTA`, `MIN`, `MAX`, `ABS`, `ROUND`, `SQRT`, `IF`, `CONCAT`, `LEN`, `UPPER`, `LOWER`, `TRIM`
  - Nested formulas: `=SUM(A1:A3)+B4*2`
  - Circular reference detection: returns `#CIRC!`
- **Real-time sync** — cell-level Firestore writes; every open session sees changes instantly
- **Write-state indicator** — live "Saving…" / "Saved" / "Error" badge in the toolbar

### Presence
- Firebase Realtime Database tracks connected users per document
- Active users shown as colored avatars with tooltips (name + selected cell)
- `onDisconnect()` cleanup ensures stale presence is removed automatically

### Identity
- **Google sign-in** via Firebase Auth
- **Guest mode** — enter a display name; no account needed
- Per-user color derived deterministically from UID — consistent across sessions

### Bonus Features
- **Cell formatting** — Bold, Italic, text color, background color, text alignment
- **Column resize** — drag the right edge of any column header
- **Row resize** — drag the bottom edge of any row number
- **Keyboard navigation** — Arrow keys, Tab, Enter, Backspace/Delete work as expected; typing a character starts editing instantly
- **Column reorder** — drag any column header to a new position (stored per document)
- **Export** — CSV and JSON export from the toolbar

---

## Architecture

### State Management
State is split into two layers:

| Layer | Technology | Why |
|---|---|---|
| **Local UI state** | Zustand + Immer | Synchronous, predictable, no prop drilling |
| **Remote data** | Firestore + RTDB | Real-time, persistent, multi-user |

**Key decision — cell-level granularity:** Each cell is stored as its own Firestore document at `documents/{docId}/cells/{cellId}`. This means concurrent edits to different cells never conflict. The last write to a given cell wins. This is correct for spreadsheets where two users editing the same cell simultaneously is expected to resolve to the last writer.

### Formula Parser
A hand-written recursive descent parser lives in `src/utils/formulaParser.ts`. Grammar:

```
expr        := comparison
comparison  := concat (('=' | '<>' | '<' | '>' | '<=' | '>=') concat)*
concat      := additive ('&' additive)*
additive    := multiplicative (('+' | '-') multiplicative)*
multiplicative := power (('*' | '/' | '%') power)*
power       := unary ('^' unary)*
unary       := ('-' | '+') unary | primary
primary     := NUMBER | STRING | cell_ref | range | function_call | '(' expr ')'
```

**Why not eval()?** Unsafe — arbitrary code execution.  
**Why not a library?** Over-engineered for scope; a parser is ~200 lines and gives full control over error messages and circular-ref detection.

### Real-time Sync
- Cells: `onSnapshot` on the entire `cells` subcollection — all changes by any user propagate to all open sessions
- Sheet meta (column widths, row heights, column order): separate `meta/sheet` document
- Presence: Firebase Realtime Database `presence/{docId}/{uid}` — `onDisconnect().remove()` handles tab closes and network drops

### Server/Client Boundaries (App Router)
- All pages are `"use client"` since they require real-time subscriptions
- Firebase is initialized once in `src/lib/firebase.ts` and imported as needed
- No server actions are used — all writes go directly to Firebase from the client, consistent with the real-time architecture

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project with:
  - Authentication (Google provider + anonymous)
  - Firestore Database
  - Realtime Database

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → Sign-in methods → Google
3. Create a **Firestore Database** (start in production mode)
4. Create a **Realtime Database**
5. Add Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /documents/{docId} {
      allow read, write: if request.auth != null;
      
      match /cells/{cellId} {
        allow read, write: if request.auth != null;
      }
      
      match /meta/{metaId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

6. Add Realtime Database rules:

```json
{
  "rules": {
    "presence": {
      "$docId": {
        "$uid": {
          ".read": "auth != null",
          ".write": "auth != null && auth.uid === $uid"
        }
      }
    }
  }
}
```

### Local Development

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/sheets.git
cd sheets
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Fill in your Firebase values

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard or via CLI:
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
# ... repeat for all NEXT_PUBLIC_ vars
```

The project builds with `next build` with **zero TypeScript errors** and **zero `@ts-ignore` directives**.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with AuthProvider
│   ├── page.tsx                # Dashboard (document list)
│   ├── globals.css
│   └── doc/[id]/
│       └── page.tsx            # Spreadsheet editor
├── components/
│   ├── auth/
│   │   ├── AuthProvider.tsx    # Auth context
│   │   └── SignInModal.tsx     # Google + guest sign-in
│   ├── dashboard/
│   │   └── DocumentCard.tsx
│   └── editor/
│       ├── Grid.tsx            # Main spreadsheet grid
│       ├── FormulaBar.tsx      # fx input bar
│       ├── Toolbar.tsx         # Formatting + export
│       ├── PresenceBar.tsx     # Active user avatars
│       └── SyncIndicator.tsx   # Save state badge
├── hooks/
│   ├── useAuth.ts              # Firebase Auth state
│   ├── useDocument.ts          # Firestore subscriptions + writes
│   └── usePresence.ts          # RTDB presence
├── lib/
│   ├── firebase.ts             # Firebase app init
│   ├── firestore.ts            # Firestore data access layer
│   └── presence.ts             # RTDB presence helpers
├── store/
│   └── spreadsheetStore.ts     # Zustand store (all local state)
├── types/
│   └── index.ts
└── utils/
    ├── formulaParser.ts        # Recursive descent formula parser
    ├── cellUtils.ts            # Address parsing, range expansion
    └── exportUtils.ts          # CSV + JSON export
```

---

## Trade-offs & Decisions

| Decision | Rationale |
|---|---|
| Cell-level Firestore docs | Minimizes write contention; no merge conflicts for different cells |
| Last-write-wins | Appropriate for spreadsheets; operational transformation is overkill for this scope |
| Zustand over Redux | Less boilerplate, better TypeScript inference, sufficient for this state shape |
| RTDB for presence | Lower latency than Firestore for ephemeral data; `onDisconnect` is a first-class primitive |
| Hand-written parser | Safe (no eval), extensible, full error control, ~200 LOC |
| Guest auth via displayName | Lowers friction; Firebase anonymous auth not used to keep identity consistent across sessions |

---

## License

MIT
