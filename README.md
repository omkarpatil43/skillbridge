# 🎓 SkillBridge — Modern Campus Collaboration & Learning Platform

Repository:[(https://github.com/omkarpatil43/skillbridge)]
SkillBridge is an all-in-one engineering college ecosystem connecting freshers, senior mentors, faculty admins, and campus clubs. It integrates academic study materials, industry skill tracks, peer doubt solving, campus chat & file sharing, AI-assisted mentoring, placement & scholarship roadmaps, and an automated ID verification pipeline.

---

## 🌟 Key Highlights & Recent Features

- 🛡️ **Initial Admin Setup Wizard (`/setup` & `/api/setup`)**:
  - **Master Key Security**: Authenticated via 256-bit `SETUP_ACCESS_KEY` configured in `.env`. Uses constant-time comparison (`crypto.timingSafeEqual`) and issues short-lived 15-minute setup tokens.
  - **Single-use Lockout**: Once the first `college_admin` account is created, the setup wizard automatically and permanently locks down (`GET /api/setup/status` returns `hasAdmin: true`, rejecting subsequent key verification attempts with `403 Forbidden`).
  - **Admin Setup UI (`SetupPage.tsx`)**: Isolated administrative console UI with password strength meter, `@pict.edu` email domain validation, rate limit handling, and in-memory token management.

- 💬 **Campus Chat & Media Sharing (`ChatPage.tsx`)**:
  - **10 Community Channels**: General Lounge, Senior Lounge, Branch Hubs (CSE, IT, E&C, Mechanical), and Year Group rooms.
  - **Rich Media & Document Attachments**: Share photos, videos, PDFs, zip archives, and code documents directly in chat.
  - **Senior / Junior Identification**: Interactive message badges highlighting verified Seniors (2nd/3rd/4th Year) and Juniors (1st Year / Freshers).

- 🆔 **AI-Powered Student ID Verification & Admin Portal (`AdminVerificationPage.tsx`)**:
  - **OCR ID Card Processing**: Uses Gemini OCR to scan student ID cards, extract batch years (e.g. 2024–2028), roll numbers, and classify academic levels.
  - **Faculty Moderation Dashboard**: College administrators can review pending verifications, inspect OCR confidence scores, view uploaded ID cards, approve/reject students, and issue admin invite tokens.

- 🎓 **Senior / Junior Academic Year System**:
  - 1st Year students are designated as **Juniors (Freshers)**.
  - 2nd, 3rd, and 4th Year students are designated as **Seniors**.
  - **Equal Collaboration Rights**: Both Seniors and Juniors can post doubts, answer questions, share file attachments, verify solution snippets, and communicate across all campus chatrooms.

- 🍃 **MongoDB Atlas & Dual Connection Scheme**:
  - Supports MongoDB Atlas Cloud cluster (`cluster0.e2l2eso.mongodb.net/skillbridge`) and local MongoDB.
  - Features dual-mode connection support (`mongodb+srv://` and standard non-SRV `mongodb://`) to bypass DNS SRV blocking on restrictive local networks/firewalls.
  - **Sanitized Logging**: `db.ts` sanitizes all driver errors to log exact error codes/names without exposing URI credentials or passwords.

- ☀️ **Light, Medium & Dark UI Themes**:
  - One-click theme switcher in the Navbar supporting crisp Light mode, soft eye-comfort Medium Slate mode, and Dark mode.

---

## ⚙️ Environment Configuration (`.env`)

Copy `.env.example` to `.env` if needed, then configure your environment variables:

```env
PORT=5000

# MongoDB Connection String (Atlas or Local)
# Atlas Standard Non-SRV (Bypasses local DNS SRV blocking):
MONGO_URI=mongodb+srv://DB_USER:DB_PASSWORD@cluster0.example.mongodb.net/skillbridge?retryWrites=true&w=majority

# JWT & Setup Security Keys
AUTH_SECRET=your-long-random-secret-key-min-32-chars
SETUP_ACCESS_KEY=your-secure-random-64-character-hex-key

# Gemini AI Configuration
GEMINI_API_KEY=your-google-gemini-api-key
GEMINI_MODEL=gemini-3.6-flash
```

> **MongoDB Atlas:** Create a database user (not an Atlas website login) and grant it `readWrite` on the `skillbridge` database. Use the connection string from Atlas **Connect → Drivers**, replacing its username and password placeholders. If the password contains special characters, URL-encode them. The server checks read access at startup and reports whether it is using MongoDB or the local fallback.
>
> **Security Note:** Keep `.env` private. Never commit `.env` to source control or expose keys in frontend `VITE_` variables. Rotate any API key or password that has been shared publicly.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (v20 recommended)
- **npm**: v9+
- **MongoDB**: MongoDB Atlas Cluster or local MongoDB Server (`mongodb://127.0.0.1:27017`)
- **Google Gemini API Key**: Obtainable from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 2. Installation & Build

```bash
# 1. Clone the repository
git clone https://github.com/nikhilpawdepict-eng/SkillBridge.git
cd SkillBridge

# 2. Install dependencies
npm install

# 3. Create .env file
# Copy .env.example to .env and configure MONGO_URI, AUTH_SECRET, SETUP_ACCESS_KEY, and GEMINI_API_KEY

# 4. Verify TypeScript build
npm run build
```

### 3. Running the Server & Client

**Terminal 1 — Backend API Server:**
```bash
npm run server
```
> Server live at: `http://localhost:5000`

**Terminal 2 — Frontend Dev Server:**
```bash
npm run dev
```
> Client live at: `http://localhost:5173`

---

## 🔑 First-Time Setup Wizard Flow

1. Open **`http://localhost:5173/setup`** in your browser.
2. **Step 1 (Key Verification)**: Enter the `SETUP_ACCESS_KEY` configured in `.env`.
3. **Step 2 (Admin Provisioning)**: Enter your full name, official `@pict.edu` email address, and a strong password (10+ characters, mixed case, number, symbol).
4. Upon submission, your **College Administrator** account will be created, and the setup wizard will permanently lock down.
5. Log in with your new credentials via the main login modal.

---

## 📂 Project Architecture

```
SkillBridge/
├── server/                      # Express + TypeScript Backend
│   ├── config/
│   │   └── db.ts                # MongoDB & Mongoose connection with error sanitization
│   ├── models/                  # Mongoose Data Models
│   │   ├── AcademicMaterial.ts
│   │   ├── AdminInvite.ts
│   │   ├── Club.ts
│   │   ├── ClubRegistration.ts
│   │   ├── Doubt.ts
│   │   ├── Placement.ts
│   │   ├── Scholarship.ts
│   │   ├── SkillResource.ts
│   │   └── User.ts
│   ├── routes/                  # Express API Handlers
│   │   ├── academicRoutes.ts
│   │   ├── adminRoutes.ts
│   │   ├── authRoutes.ts
│   │   ├── chatRoutes.ts
│   │   ├── clubRoutes.ts
│   │   ├── doubtRoutes.ts
│   │   ├── placementRoutes.ts
│   │   ├── scholarshipRoutes.ts
│   │   ├── setupRoutes.ts       # Setup wizard endpoints (/api/setup)
│   │   └── skillRoutes.ts
│   ├── seed/
│   │   └── seedData.ts          # Safe MongoDB auto-seeder (students & seniors only)
│   └── index.ts                 # Express server entry point
│
├── src/                         # React + TypeScript Frontend
│   ├── components/              # Navbar, Footer, Toast, AuthModal, HeroCanvas
│   ├── context/                 # AuthContext, DataContext (MongoDB synced)
│   ├── data/                    # Initial campus datasets (Student/Senior initial data)
│   ├── pages/                   # Application Pages
│   │   ├── AIChatbotPage.tsx    # Gemini AI Mentorship Assistant
│   │   ├── AdminVerificationPage.tsx # Faculty Moderation & Verification Portal
│   │   ├── BranchPage.tsx       # Departmental Study Resources
│   │   ├── ChatPage.tsx         # Campus Chatrooms & File Attachments
│   │   ├── ClubsPage.tsx        # Campus Clubs & Hackathon Registrations
│   │   ├── DoubtChatPage.tsx    # Peer Mentorship & Doubts
│   │   ├── HomePage.tsx         # Hero Section & Quick Links
│   │   ├── PlacementPage.tsx    # Placement Drives & Interview Guides
│   │   ├── ScholarshipsPage.tsx # Merit & Financial Opportunities
│   │   └── SetupPage.tsx        # Initial Admin Provisioning Wizard (/setup)
│   ├── services/                # api.ts (Fetch API wrappers)
│   ├── types/                   # TypeScript interfaces & types
│   ├── App.tsx                  # Main router & layout container
│   └── index.css                # Light, Medium & Dark design tokens
│
├── .env                         # Local environment variables
└── package.json
```

---

## 🛠️ Verification & Build Commands

```bash
# Type-check project
npm run build

# Run Oxlint linter
npm run lint

# Test Gemini AI API configuration
npm run test:gemini
```
