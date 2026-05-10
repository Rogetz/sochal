"# Sochal" 
# 🎤 Sochal — Live Battles on Solana

<div align="center">

**Talent earns instantly. Skill matches skill. Payouts secured on-chain.**

[![Solana](https://img.shields.io/badge/Built%20on-Solana-14F195?style=for-the-badge&logo=solana&logoColor=white)](https://solana.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TanStack](https://img.shields.io/badge/TanStack_Router-FF4154?style=for-the-badge&logo=reactrouter&logoColor=white)](https://tanstack.com/router)
[![License](https://img.shields.io/badge/License-MIT-3b82f6?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Table of Contents

1. [Overview](#-overview)
2. [Core Features](#-core-features)
3. [System Architecture](#-system-architecture)
4. [Technology Stack](#-technology-stack)
5. [Project Structure](#-project-structure)
6. [Installation & Setup](#-installation--setup)
7. [Environment Variables](#-environment-variables)
8. [Core Components Documentation](#-core-components-documentation)
9. [Smart Contract Integration](#-smart-contract-integration)
10. [State Management](#-state-management)
11. [Wallet Integration](#-wallet-integration)
12. [Media & Streaming](#-media--streaming)
13. [API Integration](#-api-integration)
14. [Styling & Theming](#-styling--theming)
15. [Development Workflow](#-development-workflow)
16. [Building for Production](#-building-for-production)
17. [Troubleshooting](#-troubleshooting)
18. [Contributing Guidelines](#-contributing-guidelines)
19. [License](#-license)

---

## 🎯 Overview

Sochal is a **decentralized live streaming platform** built on Solana where creators compete in skill-based battles and earn instantly. Fans tip in real-time, creators are matched by earnings tiers, and every payout settles on-chain — the second it ends.

### Problem Statement

| Problem | Sochal Solution |
|---------|-----------------|
| Web2 platforms take 50%+ commission | **85%** goes directly to creators |
| 30+ day payout delays | **Instant** on-chain settlement |
| Random creator matching | **Earnings-based ELO** matchmaking |
| Fans receive no rewards | **Top tippers earn 5%** of every pot |
| High fees block micro-transactions | **Solana** = $0.00025 fees, 400ms finality |

---

## ✨ Core Features

### Creator Features

| Feature | Description | Status |
|---------|-------------|--------|
| 🎥 **Go Live** | Real-time streaming with camera/mic controls | ✅ |
| 🏆 **Create Challenges** | Set topic tags, target prizes, battle rules | ✅ |
| 📊 **Live Dashboard** | Track viewers, tips, challenge progress | ✅ |
| 💰 **Instant Payouts** | Receive SOL tips immediately on-chain | ✅ |
| 📈 **Earnings Matchmaking** | Paired with creators at similar skill level | 🔄 |
| 🎬 **Create Reels** | Record and post short-form videos | ✅ |
| 📹 **Menu Items** | Set custom tip amounts for actions | 🔄 |
| 🥇 **Bracket System** | 16-pair single-elimination tournaments | 🔄 |

### Fan Features

| Feature | Description | Status |
|---------|-------------|--------|
| 📱 **TikTok-Style Feed** | Vertical scrolling reels, auto-play | ✅ |
| 🔥 **Challenge Browser** | Browse battles by category/tags | ✅ |
| 💎 **Send Tips** | Support creators with SOL in real-time | ✅ |
| 👑 **Top Tipper Rewards** | Earn 5% of every pot you back | ✅ |
| 💬 **Live Chat** | Real-time interaction during streams | ✅ |
| ❤️ **Like & Save** | Save favorite reels to profile | ✅ |
| 📤 **Share** | Share reels and live streams | ✅ |
| 💾 **Download** | Save reels locally | ✅ |

### Social Features

- ✅ Like/Unlike reels
- ✅ Comment on reels
- ✅ Share to social platforms
- ✅ Save to favorites
- ✅ Download reels
- ✅ Follow/Unfollow creators
- ✅ Real-time notifications (planned)

---

## 🏗️ System Architecture

PRESENTATION LAYER
├── Landing Page (index.tsx)
├── Fan Page (fan.tsx)
├── Creator Studio (creator.tsx)
└── Live Stream (live.$streamId.tsx)

        │
        ▼

COMPONENT LAYER
├── ReelFeed (TikTok-style vertical feed)
├── ChallengeBrowser (Browse by tags)
├── LiveStreamView (Camera/mic streaming)
├── WalletButton (Solana wallet connection)
├── ProfileSetupDialog (User profile creation)
├── CreateReelModal (Video recording)
└── GoLiveModal (Challenge selection)

        │
        ▼

STATE LAYER (Zustand Store)
├── Wallet State (address, provider)
├── Profile State (handle, displayName, bio)
├── Streams State (active streams)
├── Challenges State (battles)
└── SelectedChallenge State (current active)

        │
        ▼

SERVICE LAYER
├── Helius RPC (Solana connection)
├── 100ms / Agora (Video streaming)
├── Irys / Arweave (VOD storage)
├── Wallet Adapter (Phantom, Backpack, Solflare)
└── Media Service (Camera/mic permissions)

        │
        ▼

BLOCKCHAIN LAYER (Solana)
├── Stream PDA (Live stream data)
├── Challenge PDA (Battle bracket data)
├── Profile PDA (User metadata)
├── Bracket PDA (Tournament data)
└── Anchor Contracts (init_live, tip, create_challenge, join_challenge, settle)
### Data Flow

1. **User Interaction** → React component event
2. **State Update** → Zustand store mutation
3. **Transaction** → Solana wallet signing
4. **On-chain Execution** → Anchor program processes
5. **Event Emission** → Helius webhook triggers
6. **UI Update** → Real-time reflection

---

## 🛠️ Technology Stack

### Frontend Core

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI framework |
| TypeScript | 5.0.0 | Type safety |
| TanStack Router | 1.0.0 | File-based routing |
| TailwindCSS | 3.3.0 | Utility-first styling |
| Vite | 5.0.0 | Build tool |
| Zustand | 4.4.0 | State management |

### Solana Integration

| Technology | Version | Purpose |
|------------|---------|---------|
| @solana/web3.js | 1.87.0 | Blockchain interaction |
| @solana/wallet-adapter | 0.16.0 | Wallet connection |
| @project-serum/anchor | 0.29.0 | Smart contract client |
| @solana/spl-token | 0.3.0 | Token operations |

### UI Components

| Technology | Purpose |
|------------|---------|
| shadcn/ui | Pre-built accessible components |
| Lucide Icons | Icon library |
| Radix UI | Unstyled accessible primitives |
| Framer Motion | Animations |

### Media & Streaming

| Technology | Purpose |
|------------|---------|
| MediaDevices API | Camera/microphone access |
| MediaRecorder API | Video recording for reels |
| 100ms / Agora | Live streaming infrastructure |
| Irys (Arweave) | Permanent VOD storage |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| Husky | Git hooks |
| Commitlint | Commit message validation |

---

## 📁 Project Structure
sochal-frontend/
│
├── src/
│   ├── components/
│   │   ├── sochal/
│   │   │   ├── challenges/
│   │   │   │   ├── ChallengeBrowser.tsx      # Browse challenges by tags
│   │   │   │   ├── ChallengeCard.tsx         # Individual challenge card
│   │   │   │   └── ChallengeTagFilter.tsx    # Topic tag filtering
│   │   │   │
│   │   │   ├── live/
│   │   │   │   ├── LiveStreamView.tsx        # Full live streaming UI
│   │   │   │   ├── CreateReelModal.tsx       # Reel creation with camera
│   │   │   │   └── GoLiveModal.tsx           # Challenge selection modal
│   │   │   │
│   │   │   ├── reels/
│   │   │   │   ├── ReelFeed.tsx              # TikTok-style vertical feed
│   │   │   │   ├── ReelItem.tsx              # Individual reel component
│   │   │   │   └── CreateReelButton.tsx      # FAB for creating reels
│   │   │   │
│   │   │   ├── Header.tsx                    # Navigation header
│   │   │   ├── WalletButton.tsx              # Solana wallet connection
│   │   │   ├── ProfileSetupDialog.tsx        # User profile creation
│   │   │   ├── TopicBadge.tsx                # Topic tag badges
│   │   │   └── SolAmount.tsx                 # SOL amount formatter
│   │   │
│   │   └── ui/                               # shadcn/ui components (50+ files)
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── card.tsx
│   │       └── ... (other UI components)
│   │
│   ├── lib/
│   │   ├── sochal-store.ts                   # Global state management
│   │   ├── media.ts                          # Camera/mic handling
│   │   ├── mock-data.ts                      # Development mock data
│   │   ├── error-capture.ts                  # Error tracking
│   │   ├── error-page.ts                     # Error page rendering
│   │   └── utils.ts                          # Utility functions
│   │
│   ├── routes/
│   │   ├── __root.tsx                        # Root layout & context
│   │   ├── index.tsx                         # Landing page
│   │   ├── fan.tsx                           # Fan dashboard (reels + challenges)
│   │   ├── creator.tsx                       # Creator studio
│   │   ├── explore.tsx                       # Explore page
│   │   └── live.$streamId.tsx                # Dynamic live stream page
│   │
│   ├── types/
│   │   └── sochal.types.ts                   # TypeScript interfaces
│   │
│   ├── hooks/
│   │   └── use-mobile.tsx                    # Responsive design hook
│   │
│   └── styles.css                            # Global styles + Tailwind
│
├── public/                                    # Static assets
│   ├── favicon.svg
│   └── apple-touch-icon.png
│
├── index.html                                 # Entry HTML
├── package.json                               # Dependencies & scripts
├── tsconfig.json                              # TypeScript config
├── vite.config.ts                             # Vite configuration
├── tailwind.config.js                         # Tailwind CSS config
├── postcss.config.js                          # PostCSS config
├── components.json                            # shadcn/ui config
├── .env.example                               # Environment template
├── .gitignore                                 # Git ignore rules
├── .prettierrc                                # Prettier config
├── eslint.config.js                           # ESLint config
└── README.md                                  # Documentation

---

## 🚀 Installation & Setup

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 18.x or higher |
| npm | 9.x or higher |
| Git | Latest |
| Solana Wallet | Phantom, Backpack, or Solflare |

### Step-by-Step Installation

```bash
# 1. Clone the repository
git clone https://github.com/Rogetz/sochal-frontend.git
cd sochal-frontend

# 2. Install dependencies
npm install
# or
bun install

# 3. Create environment file
cp .env.example .env.local

# 4. Start development server
npm run dev
# or
bun dev

# 5. Open browser to http://localhost:8080
