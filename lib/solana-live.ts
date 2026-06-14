"use client";

import {
  address,
  appendTransactionMessageInstruction,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getBase58Decoder,
  getBase58Encoder,
  getBytesEncoder,
  getAddressEncoder,
  getMinimumBalanceForRentExemption,
  getProgramDerivedAddress,
  getTransactionDecoder,
  getTransactionEncoder,
  getU64Encoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  type Address,
  type SignatureBytes,
  type Transaction,
  type TransactionSendingSigner,
  signatureBytes,
} from "@solana/kit";
import {
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
} from "@solana/wallet-standard-features";
import {
  SOLANA_DEVNET_CHAIN,
  SOLANA_LOCALNET_CHAIN,
  SOLANA_MAINNET_CHAIN,
  SOLANA_TESTNET_CHAIN,
  type SolanaChain,
} from "@solana/wallet-standard-chains";
import {
  fetchMaybeGlobalState,
  findGlobalPda,
  fetchLive,
  getCreateLiveInstructionAsync,
  getCloseLiveInstruction,
  getTipLiveInstruction,
  getCloseChallengeInstructionAsync,
  getTipChallengeInstruction,
  getCreateChallengeInstruction,
  getEnterChallengeInstruction,
  type MenuItemArgs,
} from "@/app/generated/vault";
import { VAULT_PROGRAM_ADDRESS } from "@/app/generated/vault/programs";
import { sochal, type WalletStandardSession, type WalletProvider } from "@/lib/sochal-store";

type WalletStandardSessionNonNull = NonNullable<WalletStandardSession>;

const LIVE_SEED_BYTES = new Uint8Array([108, 105, 118, 101]);
const TOURNAMENT_SEED_BYTES = new Uint8Array([116, 111, 117, 114, 110, 97, 109, 101, 110, 116]);
const CHALLENGE_SEED_BYTES = new Uint8Array([99, 104, 97, 108, 108, 101, 110, 103, 101]);
const LIVE_ACCOUNT_SPACE = 20728n;

const DEFAULT_RPC_URL = "https://api.devnet.solana.com";

type SolanaErrorContext = {
  causeMessage?: string;
  logs?: string[];
};

type SolanaErrorLike = {
  message?: unknown;
  cause?: unknown;
  context?: SolanaErrorContext;
  logs?: unknown;
  data?: {
    logs?: unknown;
  };
};

function collectErrorDetails(error: unknown, seen = new Set<unknown>()): string[] {
  if (!error || typeof error !== "object" || seen.has(error)) {
    return [];
  }

  seen.add(error);

  const details: string[] = [];
  const record = error as SolanaErrorLike;

  if (typeof record.message === "string" && record.message.trim()) {
    details.push(record.message.trim());
  }

  if (record.context?.causeMessage) {
    details.push(record.context.causeMessage);
  }

  if (Array.isArray(record.context?.logs)) {
    details.push(...record.context.logs.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0));
  }

  if (Array.isArray(record.logs)) {
    details.push(...record.logs.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0));
  }

  if (Array.isArray(record.data?.logs)) {
    details.push(...record.data.logs.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0));
  }

  if ("cause" in record && record.cause) {
    details.push(...collectErrorDetails(record.cause, seen));
  }

  return Array.from(new Set(details));
}

function toErrorWithContext(error: unknown, context: string): Error {
  const extraDetails = collectErrorDetails(error)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .join("\n");

  const suffix = extraDetails ? `: ${extraDetails}` : "";

  if (error instanceof Error) {
    return new Error(`${context}: ${error.message}${suffix}`);
  }

  if (typeof error === "string") {
    return new Error(`${context}: ${error}${suffix}`);
  }

  try {
    return new Error(`${context}: ${JSON.stringify(error)}${suffix}`);
  } catch {
    return new Error(`${context}: Unknown error${suffix}`);
  }
}

function getRpcUrl() {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? DEFAULT_RPC_URL;
}

function getChainForRpcUrl(rpcUrl: string): SolanaChain {
  const normalized = rpcUrl.toLowerCase();

  if (normalized.includes("localhost") || normalized.includes("127.0.0.1")) {
    return SOLANA_LOCALNET_CHAIN;
  }

  if (normalized.includes("testnet")) {
    return SOLANA_TESTNET_CHAIN;
  }

  if (normalized.includes("devnet")) {
    return SOLANA_DEVNET_CHAIN;
  }

  return SOLANA_MAINNET_CHAIN;
}

function createWalletTransactionSendingSigner(input: {
  wallet: WalletStandardSessionNonNull["wallet"];
  account: WalletStandardSessionNonNull["account"];
  chain: SolanaChain;
  rpcUrl: string;
}): TransactionSendingSigner {
  const { wallet, account, chain, rpcUrl } = input;

  if (!wallet || !account) {
    throw new Error("No wallet-standard session available for signing.");
  }

  const feature = wallet.features[
    SolanaSignTransaction
  ] as
    | SolanaSignTransactionFeature[typeof SolanaSignTransaction]
    | undefined;

  if (!feature || !account.features.includes(SolanaSignTransaction)) {
    throw new Error(
      "Connected wallet does not support solana:signTransaction."
    );
  }

  const signAndSendTransactions: TransactionSendingSigner["signAndSendTransactions"] = async (
    transactions,
    config
  ) => {
    const encoder = getTransactionEncoder();
    const rpc = createSolanaRpc(rpcUrl);

    const signatures: SignatureBytes[] = [];

    // Handle transactions sequentially since some wallets don't support batch.
    for (const transaction of transactions) {
      const outputs = await feature.signTransaction({
        account,
        chain,
        transaction: new Uint8Array(encoder.encode(transaction as Transaction)),
        options: {
          minContextSlot:
            config?.minContextSlot !== undefined
              ? Number(config.minContextSlot)
              : undefined,
          preflightCommitment: "confirmed" as const,
        },
      });

      const firstOutput = outputs[0];
      if (!firstOutput) {
        throw new Error("Wallet did not return a signed transaction.");
      }

      const signedTransaction = getTransactionDecoder().decode(
        firstOutput.signedTransaction
      );

      const signature = await rpc
        .sendTransaction(getBase64EncodedWireTransaction(signedTransaction), {
          encoding: "base64",
          preflightCommitment: "confirmed",
          minContextSlot:
            config?.minContextSlot !== undefined ? config.minContextSlot : undefined,
        })
        .send()
        .catch((error) => {
          throw toErrorWithContext(error, "Failed to submit live transaction");
        });

      signatures.push(
        signatureBytes(getBase58Encoder().encode(signature))
      );
    }

    return signatures;
  };

  return Object.freeze({
    address: address(account.address),
    signAndSendTransactions,
  } satisfies TransactionSendingSigner);
}

async function deriveLiveAddress(
  liveCounter: bigint,
  programAddress: Address = VAULT_PROGRAM_ADDRESS
): Promise<Address> {
  const [liveAddress] = await getProgramDerivedAddress({
    programAddress,
    seeds: [
      getBytesEncoder().encode(LIVE_SEED_BYTES),
      getU64Encoder().encode(liveCounter),
    ],
  });

  return liveAddress;
}

async function deriveTournamentGroupAddress(
  topic: string,
  programAddress: Address = VAULT_PROGRAM_ADDRESS
): Promise<Address> {
  const [tournamentGroupAddress] = await getProgramDerivedAddress({
    programAddress,
    seeds: [
      getBytesEncoder().encode(TOURNAMENT_SEED_BYTES),
      new TextEncoder().encode(topic),
    ],
  });

  return tournamentGroupAddress;
}

async function deriveChallengeAddress(
  tournamentGroupAddress: string,
  round: number,
  pairIndex: number,
  programAddress: Address = VAULT_PROGRAM_ADDRESS
): Promise<Address> {
  if (!Number.isInteger(round) || round < 0 || round > 255) {
    throw new Error("round must be an integer between 0 and 255.");
  }
  if (!Number.isInteger(pairIndex) || pairIndex < 0 || pairIndex > 255) {
    throw new Error("pairIndex must be an integer between 0 and 255.");
  }

  const [challengeAddress] = await getProgramDerivedAddress({
    programAddress,
    seeds: [
      getBytesEncoder().encode(CHALLENGE_SEED_BYTES),
      getAddressEncoder().encode(address(tournamentGroupAddress)),
      new Uint8Array([round]),
      new Uint8Array([pairIndex]),
    ],
  });

  return challengeAddress;
}

async function sendInstruction(input: {
  signer: TransactionSendingSigner;
  instruction: Parameters<typeof appendTransactionMessageInstruction>[0];
  rpcUrl: string;
}): Promise<string> {
  const { signer, instruction, rpcUrl } = input;
  const rpc = createSolanaRpc(rpcUrl);

  const { context, value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(signer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstruction(instruction, tx)
  );

  const signatureBytes = await signAndSendTransactionMessageWithSigners(message, {
    minContextSlot: context.slot,
  });

  return getBase58Decoder().decode(signatureBytes);
}

export interface TipLiveOnChainInput {
  liveAddress: string;
  amountSol: number;
  menuIndex?: number | null;
}

export interface TipLiveOnChainResult {
  tipLiveSignature: string;
  amountLamports: bigint;
}

export async function tipLiveOnChain(
  input: TipLiveOnChainInput
): Promise<TipLiveOnChainResult> {
  let session = await sochal.getWalletStandardSession();

  if (!session) {
    console.warn("No wallet-standard session available, attempting reconnect fallback", { state: sochal.get() });

    try {
      const current = sochal.get().wallet;
      if (current?.provider) {
        await sochal.connect(current.provider as WalletProvider);
        session = await sochal.getWalletStandardSession();
      }
    } catch (error) {
      console.warn("Automatic wallet reconnect attempt failed:", error);
    }

    if (!session) {
      throw new Error("Wallet-standard session unavailable. Please reconnect your wallet.");
    }
  }

  const rpcUrl = getRpcUrl();
  const chain = getChainForRpcUrl(rpcUrl);
  const signer = createWalletTransactionSendingSigner({
    wallet: session.wallet,
    account: session.account,
    chain,
    rpcUrl,
  });

  const amountLamports = BigInt(Math.round(input.amountSol * 1_000_000_000));
  if (amountLamports <= 0n) {
    throw new Error("Tip amount must be greater than zero.");
  }

  const tipInstruction = getTipLiveInstruction({
    fan: signer,
    live: address(input.liveAddress),
    amount: amountLamports,
    menuIndex: input.menuIndex ?? null,
  });

  const tipLiveSignature = await sendInstruction({
    signer,
    instruction: tipInstruction,
    rpcUrl,
  });

  return {
    tipLiveSignature,
    amountLamports,
  };
}

export interface CreateChallengeOnChainInput {
  tournamentTopic: string;
  round: number;
  pairIndex: number;
}

export interface CreateChallengeOnChainResult {
  createChallengeSignature: string;
  tournamentGroupAddress: Address;
  challengeAddress: Address;
}

export async function createChallengeOnChain(
  input: CreateChallengeOnChainInput
): Promise<CreateChallengeOnChainResult> {
  let session = await sochal.getWalletStandardSession();

  if (!session) {
    console.warn("No wallet-standard session available, attempting reconnect fallback", { state: sochal.get() });

    try {
      const current = sochal.get().wallet;
      if (current?.provider) {
        await sochal.connect(current.provider as WalletProvider);
        session = await sochal.getWalletStandardSession();
      }
    } catch (error) {
      console.warn("Automatic wallet reconnect attempt failed:", error);
    }

    if (!session) {
      throw new Error("Wallet-standard session unavailable. Please reconnect your wallet.");
    }
  }

  if (!Number.isInteger(input.pairIndex) || input.pairIndex < 0 || input.pairIndex > 255) {
    throw new Error("pairIndex must be an integer between 0 and 255.");
  }

  const rpcUrl = getRpcUrl();
  const chain = getChainForRpcUrl(rpcUrl);
  const signer = createWalletTransactionSendingSigner({
    wallet: session.wallet,
    account: session.account,
    chain,
    rpcUrl,
  });

  const tournamentGroupAddress = await deriveTournamentGroupAddress(
    input.tournamentTopic,
    VAULT_PROGRAM_ADDRESS
  );

  const challengeAddress = await deriveChallengeAddress(
    tournamentGroupAddress,
    input.round,
    input.pairIndex,
    VAULT_PROGRAM_ADDRESS
  );

  const createChallengeInstruction = getCreateChallengeInstruction({
    payer: signer,
    tournamentGroup: tournamentGroupAddress,
    challenge: challengeAddress,
    pairIndex: input.pairIndex,
  }, {
    programAddress: VAULT_PROGRAM_ADDRESS,
  });

  const createChallengeSignature = await sendInstruction({
    signer,
    instruction: createChallengeInstruction,
    rpcUrl,
  });

  return {
    createChallengeSignature,
    tournamentGroupAddress,
    challengeAddress,
  };
}

export interface EnterChallengeOnChainInput {
  liveAddress: string;
  tournamentTopic: string;
}

export interface EnterChallengeOnChainResult {
  enterChallengeSignature: string;
  tournamentGroupAddress: Address;
}

export async function enterChallengeOnChain(
  input: EnterChallengeOnChainInput
): Promise<EnterChallengeOnChainResult> {
  let session = await sochal.getWalletStandardSession();

  if (!session) {
    console.warn("No wallet-standard session available, attempting reconnect fallback", { state: sochal.get() });

    try {
      const current = sochal.get().wallet;
      if (current?.provider) {
        await sochal.connect(current.provider as WalletProvider);
        session = await sochal.getWalletStandardSession();
      }
    } catch (error) {
      console.warn("Automatic wallet reconnect attempt failed:", error);
    }

    if (!session) {
      throw new Error("Wallet-standard session unavailable. Please reconnect your wallet.");
    }
  }

  const rpcUrl = getRpcUrl();
  const chain = getChainForRpcUrl(rpcUrl);
  const signer = createWalletTransactionSendingSigner({
    wallet: session.wallet,
    account: session.account,
    chain,
    rpcUrl,
  });

  const tournamentGroupAddress = await deriveTournamentGroupAddress(
    input.tournamentTopic,
    VAULT_PROGRAM_ADDRESS
  );

  const enterChallengeInstruction = getEnterChallengeInstruction({
    creator: signer,
    live: address(input.liveAddress),
    tournamentGroup: tournamentGroupAddress,
  }, {
    programAddress: VAULT_PROGRAM_ADDRESS,
  });

  const enterChallengeSignature = await sendInstruction({
    signer,
    instruction: enterChallengeInstruction,
    rpcUrl,
  });

  return {
    enterChallengeSignature,
    tournamentGroupAddress,
  };
}

export interface TipChallengeOnChainInput {
  challengeAddress: string;
  amountSol: number;
  creatorSide: number;
}

export interface TipChallengeOnChainResult {
  tipChallengeSignature: string;
  amountLamports: bigint;
}

export async function tipChallengeOnChain(
  input: TipChallengeOnChainInput
): Promise<TipChallengeOnChainResult> {
  let session = await sochal.getWalletStandardSession();

  if (!session) {
    console.warn("No wallet-standard session available, attempting reconnect fallback", { state: sochal.get() });

    try {
      const current = sochal.get().wallet;
      if (current?.provider) {
        await sochal.connect(current.provider as WalletProvider);
        session = await sochal.getWalletStandardSession();
      }
    } catch (error) {
      console.warn("Automatic wallet reconnect attempt failed:", error);
    }

    if (!session) {
      throw new Error("Wallet-standard session unavailable. Please reconnect your wallet.");
    }
  }

  if (!Number.isInteger(input.creatorSide) || input.creatorSide < 0 || input.creatorSide > 255) {
    throw new Error("creatorSide must be a valid creator side index.");
  }

  const rpcUrl = getRpcUrl();
  const chain = getChainForRpcUrl(rpcUrl);
  const signer = createWalletTransactionSendingSigner({
    wallet: session.wallet,
    account: session.account,
    chain,
    rpcUrl,
  });

  const amountLamports = BigInt(Math.round(input.amountSol * 1_000_000_000));
  if (amountLamports <= 0n) {
    throw new Error("Tip amount must be greater than zero.");
  }

  const tipChallengeInstruction = getTipChallengeInstruction({
    fan: signer,
    challenge: address(input.challengeAddress),
    creatorSide: input.creatorSide,
    amount: amountLamports,
  }, {
    programAddress: VAULT_PROGRAM_ADDRESS,
  });

  const tipChallengeSignature = await sendInstruction({
    signer,
    instruction: tipChallengeInstruction,
    rpcUrl,
  });

  return {
    tipChallengeSignature,
    amountLamports,
  };
}

export interface CloseChallengeOnChainInput {
  challengeAddress: string;
  tournamentGroupAddress: string;
  winnerAddress: string;
  loserAddress: string;
  topTipperAddress: string;
  prizeVaultAddress?: string;
  treasuryAddress?: string;
}

export interface CloseChallengeOnChainResult {
  closeChallengeSignature: string;
}

export async function closeChallengeOnChain(
  input: CloseChallengeOnChainInput
): Promise<CloseChallengeOnChainResult> {
  let session = await sochal.getWalletStandardSession();

  if (!session) {
    console.warn("No wallet-standard session available, attempting reconnect fallback", { state: sochal.get() });

    try {
      const current = sochal.get().wallet;
      if (current?.provider) {
        await sochal.connect(current.provider as WalletProvider);
        session = await sochal.getWalletStandardSession();
      }
    } catch (error) {
      console.warn("Automatic wallet reconnect attempt failed:", error);
    }

    if (!session) {
      throw new Error("Wallet-standard session unavailable. Please reconnect your wallet.");
    }
  }

  const rpcUrl = getRpcUrl();
  const chain = getChainForRpcUrl(rpcUrl);
  const signer = createWalletTransactionSendingSigner({
    wallet: session.wallet,
    account: session.account,
    chain,
    rpcUrl,
  });

  const closeChallengeInstruction = await getCloseChallengeInstructionAsync({
    challenge: address(input.challengeAddress),
    tournamentGroup: address(input.tournamentGroupAddress),
    winner: address(input.winnerAddress),
    loser: address(input.loserAddress),
    topTipper: address(input.topTipperAddress),
    prizeVault: input.prizeVaultAddress
      ? address(input.prizeVaultAddress)
      : undefined,
    treasury: input.treasuryAddress
      ? address(input.treasuryAddress)
      : undefined,
  }, {
    programAddress: VAULT_PROGRAM_ADDRESS,
  });

  const closeChallengeSignature = await sendInstruction({
    signer,
    instruction: closeChallengeInstruction,
    rpcUrl,
  });

  return {
    closeChallengeSignature,
  };
}

export interface CreateLiveOnChainInput {
  topic: string;
  menuItems?: MenuItemArgs[];
}


export interface CreateLiveOnChainResult {
  createLiveSignature: string;
  liveAddress: Address;
  liveId: bigint;
}

export interface CloseLiveOnChainInput {
  liveAddress: string;
  force?: boolean;
}

export interface CloseLiveOnChainResult {
  closeLiveSignature: string;
}

export async function closeLiveOnChain(
  input: CloseLiveOnChainInput
): Promise<CloseLiveOnChainResult> {
  let session = await sochal.getWalletStandardSession();

  if (!session) {
    console.warn("No wallet-standard session available, attempting reconnect fallback", { state: sochal.get() });

    try {
      const current = sochal.get().wallet;
      if (current?.provider) {
        await sochal.connect(current.provider as WalletProvider);
        session = await sochal.getWalletStandardSession();
      }
    } catch (error) {
      console.warn("Automatic wallet reconnect attempt failed:", error);
    }

    if (!session) {
      throw new Error("Wallet-standard session unavailable. Please reconnect your wallet.");
    }
  }

  const rpcUrl = getRpcUrl();
  const chain = getChainForRpcUrl(rpcUrl);
  const signer = createWalletTransactionSendingSigner({
    wallet: session.wallet,
    account: session.account,
    chain,
    rpcUrl,
  });

  const rpc = createSolanaRpc(rpcUrl);

  const [globalAddress] = await findGlobalPda({ programAddress: VAULT_PROGRAM_ADDRESS });
  const maybeGlobal = await fetchMaybeGlobalState(rpc, globalAddress);
  if (!maybeGlobal.exists) {
    throw new Error("GlobalState is not initialized on this cluster. Initialize the program first.");
  }

  const live = await fetchLive(rpc, address(input.liveAddress));

  const closeLiveInstruction = getCloseLiveInstruction({
    live: address(input.liveAddress),
    creator: address(live.data.creator),
    topTipper: address(live.data.topTipper),
    force: input.force ?? false,
    global: globalAddress,
    adminRecipient: address(maybeGlobal.data.admin),
  }, {
    programAddress: VAULT_PROGRAM_ADDRESS,
  });

  const closeLiveSignature = await sendInstruction({
    signer,
    instruction: closeLiveInstruction,
    rpcUrl,
  });

  return {
    closeLiveSignature,
  };
}

export async function createLiveOnChain(
  input: CreateLiveOnChainInput
): Promise<CreateLiveOnChainResult> {
  let session = await sochal.getWalletStandardSession();

  if (!session) {
    console.warn("No wallet-standard session available, attempting reconnect fallback", { state: sochal.get() });

    // Try to re-establish a wallet-standard session by triggering a connect
    // flow for the provider the user currently has stored in state. This
    // may prompt the wallet UI if needed and will populate the session if
    // the wallet supports the wallet-standard API.
    try {
      const current = sochal.get().wallet;
      if (current?.provider) {
        await sochal.connect(current.provider as WalletProvider);
        session = await sochal.getWalletStandardSession();
      }
    } catch (e) {
      console.warn("Automatic wallet reconnect attempt failed:", e);
    }

    if (!session) {
      console.error("Session debug:", { state: sochal.get() });
      throw new Error(
        "Wallet-standard session unavailable. Please reconnect your wallet."
      );
    }
  }

  const rpcUrl = getRpcUrl();
  const chain = getChainForRpcUrl(rpcUrl);
  const rpc = createSolanaRpc(rpcUrl);
  
  try {
    const requiredLamports = getMinimumBalanceForRentExemption(
      LIVE_ACCOUNT_SPACE
    );

    const walletBalance = await rpc.getBalance(address(session.account.address)).send();
    if (walletBalance.value < requiredLamports) {
      throw new Error(
        `Wallet balance is too low to create a live account. Need at least ${requiredLamports} lamports for rent exemption, but wallet has ${walletBalance.value} lamports.`
      );
    }

    const signer = createWalletTransactionSendingSigner({
      wallet: session.wallet,
      account: session.account,
      chain,
      rpcUrl,
    });

    const [globalAddress] = await findGlobalPda({
      programAddress: VAULT_PROGRAM_ADDRESS,
    });

    const maybeGlobal = await fetchMaybeGlobalState(rpc, globalAddress);

    if (!maybeGlobal.exists) {
      throw new Error(
        "GlobalState is not initialized on this cluster. Initialize the program first."
      );
    }

    const liveCounter = maybeGlobal.data.liveCounter;

    const liveAddress = await deriveLiveAddress(
      liveCounter,
      VAULT_PROGRAM_ADDRESS
    );

    const createLiveIx = await getCreateLiveInstructionAsync({
      creator: signer,
      live: liveAddress,
      topic: input.topic,
      menuItems: input.menuItems ?? [],
    }, {
      programAddress: VAULT_PROGRAM_ADDRESS,
    });

    const createLiveSignature = await sendInstruction({
      signer,
      instruction: createLiveIx,
      rpcUrl,
    });

    return {
      createLiveSignature,
      liveAddress,
      liveId: liveCounter,
    };
  } catch (error) {
    console.error("createLiveOnChain error:", error);
    throw toErrorWithContext(error, "Failed to create live on-chain");
  }
}


