# Socha Anchor Backend

Modern Anchor backend for the `vault` Solana program.

This folder contains the Rust smart contract, Anchor workspace config, and build artifacts used by the app.

## Program Details

- Program name: `vault`
- Program ID: `DtkhpMSR9ZXjZCiGurAVFSMANJ9cAEQAxWdgczvCdLSB`
- Cluster (default): `devnet`
- Anchor workspace root: `anchor/`

## Prerequisites

Install these before running backend commands:

1. Rust (stable) + Cargo
2. Solana CLI
3. Anchor CLI (`avm` recommended)

Optional but recommended:

- WSL2 on Windows (Ubuntu), then run commands inside WSL

## Quick Start

From the project root:

```bash
cd anchor
anchor build
```

If your wallet and RPC are configured, you can deploy to devnet:

```bash
anchor deploy --provider.cluster devnet
```

## Backend Rust Workflow

### 1. Build the Program

```bash
cd anchor
anchor build
```

This compiles `programs/vault/src/lib.rs` and updates artifacts in `target/`.

### 2. Run Rust Tests

Workspace Rust tests:

```bash
cd anchor
cargo test
```

Anchor test command (if you add/maintain Anchor tests):

```bash
cd anchor
anchor test --skip-deploy
```

### 3. Deploy to Devnet

```bash
cd anchor
solana airdrop 2 --url devnet
anchor deploy --provider.cluster devnet
```

### 4. Keep Program ID in Sync

If you rotate keypairs or redeploy with a new ID, update both:

- `anchor/Anchor.toml` under `[programs.devnet]`
- `anchor/programs/vault/src/lib.rs` in `declare_id!("...")`

### 5. Regenerate Frontend Client (Codama)

After IDL or program changes:

```bash
cd ..
npm run codama:js
```

## Folder Structure

```text
anchor/
├─ Anchor.toml                     # Anchor workspace config (cluster, wallet, scripts)
├─ Cargo.toml                      # Rust workspace manifest
├─ Cargo.lock
├─ README.md
├─ dadcHse4Z1Ud9hrYiMqLjcQmKJTHjPz8rDEmYff8w5L.json  # local wallet keypair (provider)
├─ programs/
│  └─ vault/
│     ├─ Cargo.toml                # Program crate config + Anchor features
│     └─ src/
│        └─ lib.rs                 # Main on-chain program logic
└─ target/                         # Build output, IDL, deploy artifacts
```

## Useful Commands

```bash
# Check Solana CLI + cluster
solana config get

# Confirm wallet in use
solana address

# Build only the vault crate via Cargo
cargo build --manifest-path programs/vault/Cargo.toml
```

## Notes

- Current program features include `init-if-needed` via `anchor-lang`.
- Build warnings from dependency cfg checks can appear on newer toolchains; focus on Rust compile errors first.
