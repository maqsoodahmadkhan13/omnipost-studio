# OmniPost Studio

A minimalist, high-reliability centralized social media publishing and scheduling platform.

OmniPost Studio allows users to connect multiple social channels (**Facebook**, **Instagram**, **LinkedIn**), compose posts with cloud media attachments via **ImageKit**, select target accounts, publish immediately or schedule with **Redis + BullMQ**, and independently track publication statuses per channel with targeted retry capabilities.

---

## 🌟 Key Features

1. **Multi-Account Social Publishing**:
   - Compose once, publish to **Facebook Pages**, **Instagram Professional**, and **LinkedIn** simultaneously.
   - Independent per-platform publication tracking (`published`, `partially_published`, `failed`).

2. **Zero-Leak Token Architecture**:
   - OAuth access and refresh tokens are stored securely in MongoDB and strictly redacted from all client API responses and logs.

3. **Timezone-Aware Scheduling with BullMQ & Redis**:
   - Posts are scheduled relative to the user's selected timezone and stored consistently in UTC.
   - Jobs are processed by a dedicated, isolated publishing worker process (`npm run worker`).

4. **Independent Platform Retry System**:
   - If one platform fails (e.g. temporary API error on LinkedIn), the user can retry **only the failed channel** without republishing to successful platforms.

5. **ImageKit Cloud Media Flow**:
   - Direct client-to-cloud upload with signature authentication from the backend.

6. **Minimalist Responsive UI**:
   - Clean React 18 + Vite + Tailwind CSS interface featuring Dashboard metrics, Post Composer, Posts Manager, Visual Monthly Calendar, and Accounts Hub.

---

## 🏗️ Architecture

```text
                         ┌─────────────────────┐
                         │   React + Vite      │
                         │   Tailwind CSS      │
                         └──────────┬──────────┘
                                    │
                              REST API
                                    │
                         ┌──────────▼──────────┐
                         │ Node.js + Express   │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
        ┌──────────┐          ┌──────────┐         ┌──────────┐
        │ MongoDB  │          │ ImageKit │         │  Redis   │
        └──────────┘          └──────────┘         └────┬─────┘
                                                        │
                                                     BullMQ
                                                        │
                                                        ▼
                                              ┌──────────────────┐
                                              │ Publishing Worker│
                                              └────────┬─────────┘
                                                       │
                                              Publishing Service
                                                       │
                            ┌──────────────────────────┼─────────────────────┐
                            │                          │                     │
                            ▼                          ▼                     ▼
                       Facebook                  Instagram              LinkedIn
                            │                          │                     │
                            └──────────────────────────┼─────────────────────┘
                                                       │
                                                       ▼
                                               Publication Results
                                                       │
                                                       ▼
                                                    MongoDB
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18 or higher
- **MongoDB**: Local MongoDB or MongoDB Atlas URI
- **Redis**: Local Redis server (`127.0.0.1:6379`) or cloud Redis instance
- **ImageKit Account** (Optional for production cloud uploads; development mock mode supported)

### 1. Installation

From the root directory:

```bash
npm run install:all
```

Or install individually:
```bash
npm install
npm install --prefix server
npm install --prefix client
```

### 2. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Configure your credentials in `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/omnipost
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=supersecret_omnipost_jwt_key
IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=
```

### 3. Running the Application

In development mode:

```bash
# Run server, worker, and frontend client concurrently
npm run dev:all
```

Or run each process independently in separate terminals:
```bash
# Terminal 1: Backend Express API
npm run server:dev

# Terminal 2: Dedicated BullMQ Publishing Worker
npm run worker:dev

# Terminal 3: React Frontend (Vite)
npm run client:dev
```

Open your browser at `http://localhost:5173`.

---

## 🧪 Testing & Verification

Run the end-to-end automated test suite:

```bash
cd server
node test/e2e.test.js
```

---

## 📁 Repository Structure

```text
omnipost-studio/
├── client/                     # React 18 + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/         # MediaUploader, AuthRoutes, UI elements
│   │   ├── context/            # AuthContext (JWT & session state)
│   │   ├── layouts/            # AppLayout (Sidebar & navigation)
│   │   ├── pages/
│   │   │   ├── Login/
│   │   │   ├── Register/
│   │   │   ├── Dashboard/      # Summary statistics & recent activity
│   │   │   ├── CreatePost/     # Multi-platform post composer
│   │   │   ├── Posts/          # Posts list & per-platform retry modal
│   │   │   ├── Calendar/       # Visual monthly scheduled view
│   │   │   ├── Accounts/       # OAuth social account manager
│   │   │   └── Settings/       # Timezone preferences & profile
│   │   └── services/           # Axios API services
├── server/                     # Node.js + Express REST API & Worker
│   ├── src/
│   │   ├── config/             # DB, Redis, ImageKit, Environment
│   │   ├── controllers/        # Auth, Posts, Social, Media, Dashboard
│   │   ├── middleware/         # Auth, Zod validation, Error handling
│   │   ├── models/             # User, SocialAccount, Post, PostPublication
│   │   ├── providers/social/   # Facebook, Instagram, LinkedIn, Mock
│   │   ├── queues/             # BullMQ queue definitions
│   │   ├── routes/             # REST API routes
│   │   ├── schemas/            # Zod validation schemas
│   │   └── services/           # Centralized PublishingService
│   ├── worker/                 # Independent BullMQ Publishing Worker process
│   └── test/                   # Automated E2E test suites
├── .env.example
├── OMNIPOST_IMPLEMENTATION_SPEC.md
└── package.json
```
