# Socha Monorepo

Full-stack Solana project with:

- A Next.js app (UI + wallet + API routes + generated program client)
- An Anchor Rust backend program (`vault`)

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Solana JS: `@solana/kit` + wallet-standard
- Real-time: Agora (`agora-rtc-react`, `agora-rtc-sdk-ng`)
- Backend program: Anchor (`anchor-lang` 0.32.1, Rust)
- Client generation: Codama

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Build backend + generate client

```bash
npm run setup
```

This runs:

- `npm run anchor-build` -> `cd anchor && anchor build`
- `npm run codama:js` -> regenerates `app/generated/vault`

### 3. Start the app

```bash
npm run dev
```

Open http://localhost:3000.

## Scripts

Root scripts from `package.json`:

- `npm run dev` - start Next.js dev server
- `npm run build` - production build
- `npm run start` - run built app
- `npm run lint` - ESLint
- `npm run format` - Prettier write
- `npm run format:check` - Prettier check
- `npm run anchor-build` - build Anchor program
- `npm run anchor-test` - run Anchor tests (`--skip-deploy`)
- `npm run codama:js` - regenerate TypeScript client from IDL
- `npm run setup` - backend build + client generation

## Project Structure

```text
socha/
├─ app/
│  ├─ api/
│  │  └─ agora/
│  │     └─ token/                # Agora token route(s)
│  ├─ components/
│  │  ├─ conference/              # Conference UI pieces
│  │  ├─ Conference.tsx
│  │  ├─ ConferenceHome.tsx
│  │  ├─ ControlBar.tsx
│  │  ├─ HomeComponent.tsx
│  │  ├─ JoinScreen.tsx
│  │  ├─ VideoGrid.tsx
│  │  ├─ VideoTile.tsx
│  │  ├─ providers.tsx            # App providers (theme, cluster, wallet, Solana, Agora)
│  │  ├─ cluster-context.tsx
│  │  ├─ cluster-select.tsx
│  │  ├─ wallet-button.tsx
│  │  ├─ theme-toggle.tsx
│  │  └─ grid-background.tsx
│  ├─ conference/                 # Conference pages/routes
│  ├─ generated/
│  │  └─ vault/
│  │     ├─ accounts/
│  │     ├─ errors/
│  │     ├─ instructions/
│  │     ├─ pdas/
│  │     ├─ programs/
│  │     ├─ shared/
│  │     ├─ types/
│  │     └─ index.ts              # Codama-generated Vault client
│  ├─ lib/
│  │  ├─ hooks/                   # React hooks (balance, tx, conference, token, etc.)
│  │  ├─ wallet/                  # wallet-standard integration
│  │  ├─ agoraConfig.ts
│  │  ├─ solana-client.ts
│  │  ├─ solana-client-context.tsx
│  │  ├─ explorer.ts
│  │  ├─ lamports.ts
│  │  ├─ error.ts
│  │  └─ errors.ts
│  ├─ types/
│  ├─ globals.css
│  ├─ icon.svg
│  ├─ layout.tsx
│  └─ page.tsx
├─ anchor/
│  ├─ Anchor.toml                 # Anchor config (cluster, wallet, program IDs)
│  ├─ Cargo.toml                  # Rust workspace
│  ├─ programs/
│  │  └─ vault/
│  │     ├─ Cargo.toml            # Program crate + features
│  │     └─ src/
│  │        └─ lib.rs             # Main on-chain Rust program
│  ├─ target/                     # Build artifacts + IDL + deploy output
│  └─ README.md                   # Backend-focused docs
├─ codama.json                    # Codama generation config
├─ package.json
├─ next.config.ts
├─ tsconfig.json
└─ README.md
```

## Backend (Anchor) Workflow

From repo root:

```bash
npm run anchor-build
npm run anchor-test
```

Or directly:

```bash
cd anchor
anchor build
anchor test --skip-deploy
```

For deploy and deeper backend notes, see `anchor/README.md`.

## Frontend + Program Client Workflow

When Rust program/IDL changes:

1. `npm run anchor-build`
2. `npm run codama:js`
3. `npm run dev` (or `npm run build`)

This keeps `app/generated/vault` in sync with the backend program.

## Environment Notes

- Main app env file: `.env.local`
- Agora app ID expected as `NEXT_PUBLIC_AGORA_APP_ID`
- Solana wallet and cluster defaults are managed via app contexts and local storage

## Common Commands

```bash
# Full local prep
npm run setup

# Production build check
npm run build

# CI-like local check
npm run ci
```
