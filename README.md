# 🎤 Sochal — Live Battles on Solana

<div align="center">

# 🎬 Sochal

### Talent earns instantly. Skill matches skill. Payouts secured on-chain.

<br/>

[![Solana](https://img.shields.io/badge/Built%20on-Solana-14F195?style=for-the-badge&logo=solana&logoColor=white)](https://solana.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-3b82f6?style=for-the-badge)](LICENSE)

<br/>

**TikTok + Twitch + Solana = Sochal**

</div>

---

# 📖 Table of Contents

```txt
- Overview
- Features
- Tech Stack
- Project Structure
- Installation
- Environment Variables
- Scripts
- Deployment
- Contributing
- License
```

---

# 🎯 Overview

```txt
Sochal is a decentralized creator platform built on Solana where creators can:

🎥 Go live
⚔️ Battle creators
💰 Earn SOL instantly
🎬 Create TikTok-style reels
🔥 Build fan communities

Fans can:

❤️ Like reels
💬 Chat live
💎 Tip creators
👑 Become top supporters

All payouts happen instantly on-chain using Solana.
```

---

# 🚨 Problem Solved

| Problem | Sochal Solution |
|----------|----------------|
| Platforms take huge fees | Creators keep 85% |
| Slow payouts | Instant SOL settlement |
| Random creator discovery | Skill-based matching |
| Fans gain nothing | Top tippers earn rewards |

---

# ✨ Features

## 🎥 Creator Features

| Feature | Status |
|---------|--------|
| Go Live with Camera/Mic | ✅ |
| TikTok-style Reel Recording | ✅ |
| Battle Other Creators | ✅ |
| Create Challenges | ✅ |
| Earn SOL Tips | ✅ |
| Live Dashboard | ✅ |
| Wallet Integration | ✅ |

---

## 👑 Fan Features

| Feature | Status |
|---------|--------|
| Reel Feed | ✅ |
| Live Chat | ✅ |
| Like & Share | ✅ |
| Real-time Tipping | ✅ |
| Browse Challenges | ✅ |
| Join Live Battles | ✅ |

---

# 🛠️ Tech Stack

## Frontend

| Technology | Purpose |
|------------|---------|
| Next.js 14 | React Framework |
| TypeScript | Type Safety |
| TailwindCSS | Styling |
| Zustand | State Management |
| shadcn/ui | UI Components |

---

## Blockchain

| Technology | Purpose |
|------------|---------|
| Solana | Payments |
| Wallet Adapter | Wallet Connection |
| web3.js | Blockchain SDK |

---

## Media

| Technology | Purpose |
|------------|---------|
| MediaDevices API | Camera & Mic |
| MediaRecorder API | Video Recording |

---

# 📁 Project Structure

```bash
sochal-frontend/
│
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   ├── providers.tsx
│   │
│   ├── creator/
│   │   └── page.tsx
│   │
│   ├── explore/
│   │   └── page.tsx
│   │
│   ├── fan/
│   │   └── page.tsx
│   │
│   └── live/
│       └── [streamId]/
│           └── page.tsx
│
├── components/
│   ├── sochal/
│   │   ├── Header.tsx
│   │   ├── WalletButton.tsx
│   │   ├── ProfileSetupDialog.tsx
│   │   │
│   │   ├── challenges/
│   │   ├── live/
│   │   └── reels/
│   │
│   └── ui/
│
├── lib/
│   ├── sochal-store.ts
│   ├── media.ts
│   ├── mock-data.ts
│   └── utils.ts
│
├── public/
├── types/
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

---

# 🚀 Installation

## 1️⃣ Clone Repository

```bash
git clone https://github.com/Rogetz/sochal.git
```

## 2️⃣ Enter Project Folder

```bash
cd sochal
```

## 3️⃣ Install Dependencies

```bash
npm install
```

## 4️⃣ Create Environment File

```bash
touch .env.local
```

## 5️⃣ Add Environment Variables

```env
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key
```

## 6️⃣ Start Development Server

```bash
npm run dev
```

## 7️⃣ Open in Browser

```txt
http://localhost:3000
```

---

# 🔧 Environment Variables

```env
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key
```

---

# 📜 Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

---

# 🎬 Reel System

```txt
The platform includes:

- TikTok-style reels
- Camera recording
- Music support
- Filters
- Live preview
- Instant posting
- Mobile responsive UI
- Mic & camera switching
```

---

# 🔐 Wallet Support

```txt
Supported wallets:

- Phantom
- Solflare
- Backpack
```

---

# 🚢 Deployment

## Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

## Deploy to Netlify

```bash
npm run build
```

---

# 🤝 Contributing

## Fork Repository

```bash
git fork
```

## Create Branch

```bash
git checkout -b feature/amazing-feature
```

## Commit Changes

```bash
git commit -m "Add amazing feature"
```

## Push Changes

```bash
git push origin feature/amazing-feature
```

---

# 📄 License

```txt
MIT License
```

---

<div align="center">

# 🎤 Made with Solana + Next.js

### Empowering creators with Web3

<br/>

⭐ Star the repository if you like the project

</div>
