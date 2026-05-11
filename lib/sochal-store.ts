"use client";

import { useSyncExternalStore } from "react";
import {
  Battle,
  getActiveBattleForCreator,
  updateBattleTips,
  endBattle,
  checkAndQueueCreator,
} from "./battle-service";

export type Role = "fan" | "creator";

export type Topic =
  | "Singing"
  | "Dancing"
  | "Comedy"
  | "Rap"
  | "Gaming"
  | "Cooking";

export const TOPICS: Topic[] = [
  "Singing",
  "Dancing",
  "Comedy",
  "Rap",
  "Gaming",
  "Cooking",
];

export type WalletProvider = "Phantom" | "Backpack" | "Solflare";

export interface SochalProfile {
  handle: string;
  displayName: string;
  bio?: string;
  createdAt: number;
}

export interface LiveStream {
  id: string;
  ownerWallet: string;
  handle: string;
  displayName: string;
  topic: Topic;
  title: string;
  startedAt: number;
  isLive: boolean;
  potSol: number;
  targetSol: number;
  viewers: number;
}

export interface Challenge {
  id: string;
  topic: Topic;
  title: string;
  description: string;
  creatorId: string;
  targetMin: number;
  participants: string[];
  status: "waiting" | "active" | "completed" | "cancelled";
  createdAt: number;
  endsAt: number;
}

interface SochalState {
  wallet: { address: string; provider: WalletProvider } | null;
  profile: SochalProfile | null;
  role: Role | null;
  topic: Topic | null;
  streams: LiveStream[];
  challenges: Challenge[];
  selectedChallenge: Challenge | null;
  activeBattle: Battle | null;
}

const KEY = "sochal:state:v2";

const initial: SochalState = {
  wallet: null,
  profile: null,
  role: null,
  topic: null,
  streams: [],
  challenges: [],
  selectedChallenge: null,
  activeBattle: null,
};

let state: SochalState = initial;

if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(KEY);

    if (raw) {
      state = {
        ...initial,
        ...JSON.parse(raw),
      };
    }
  } catch {}
}

const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((l) => l());
};

const persist = () => {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
};

type InjectedProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect: (
    opts?: { onlyIfTrusted?: boolean }
  ) => Promise<{ publicKey: { toString(): string } }>;
  disconnect: () => Promise<void>;
};

function getInjected(provider: WalletProvider): InjectedProvider | null {
  if (typeof window === "undefined") return null;

  const w = window as any;

  switch (provider) {
    case "Phantom":
      return w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null);

    case "Backpack":
      return w.backpack?.solana ?? w.xnft?.solana ?? null;

    case "Solflare":
      return w.solflare ?? null;

    default:
      return null;
  }
}

export const WALLET_INSTALL_URL: Record<WalletProvider, string> = {
  Phantom: "https://phantom.app/download",
  Backpack: "https://backpack.app/downloads",
  Solflare: "https://solflare.com/download",
};

export function isWalletInstalled(provider: WalletProvider): boolean {
  return !!getInjected(provider);
}

export const sochal = {
  get: () => state,

  subscribe: (listener: () => void) => {
    listeners.add(listener);

    return () => listeners.delete(listener);
  },

  connect: async (provider: WalletProvider) => {
    const injected = getInjected(provider);

    if (!injected) {
      const err = new Error(`${provider} wallet not detected`);
      (err as any).code = "WALLET_NOT_INSTALLED";
      throw err;
    }

    const res = await injected.connect();

    const address =
      res.publicKey?.toString() ?? injected.publicKey?.toString();

    if (!address) {
      throw new Error(`${provider} did not return a public key`);
    }

    state = {
      ...state,
      wallet: {
        address,
        provider,
      },
    };

    persist();
    emit();
  },

  disconnect: async () => {
    if (state.wallet) {
      try {
        await getInjected(state.wallet.provider)?.disconnect();
      } catch {}
    }

    state = { ...initial };

    persist();
    emit();
  },

  saveProfile: (
    p: Omit<SochalProfile, "createdAt"> & { createdAt?: number }
  ) => {
    state = {
      ...state,
      profile: {
        ...p,
        createdAt: p.createdAt ?? Date.now(),
      },
    };

    persist();
    emit();
  },

  setRole: (role: Role) => {
    state = {
      ...state,
      role,
    };

    persist();
    emit();
  },

  setTopic: (topic: Topic) => {
    state = {
      ...state,
      topic,
    };

    persist();
    emit();
  },

  createChallenge: (
    challenge: Omit<
      Challenge,
      "id" | "createdAt" | "status" | "participants"
    >
  ) => {
    if (!state.wallet) {
      throw new Error("Wallet required");
    }

    const wallet = state.wallet;

    const newChallenge: Challenge = {
      ...challenge,
      id: `ch_${Date.now()}`,
      participants: [wallet.address],
      status: "waiting",
      createdAt: Date.now(),
    };

    state = {
      ...state,
      challenges: [newChallenge, ...state.challenges],
      selectedChallenge: newChallenge,
    };

    persist();
    emit();

    return newChallenge;
  },

  setSelectedChallenge: (challenge: Challenge | null) => {
    state = {
      ...state,
      selectedChallenge: challenge,
    };

    persist();
    emit();
  },

  joinChallenge: (challengeId: string) => {
    if (!state.wallet) return;

    const wallet = state.wallet;

    state = {
      ...state,
      challenges: state.challenges.map((c) =>
        c.id === challengeId &&
        !c.participants.includes(wallet.address)
          ? {
              ...c,
              participants: [...c.participants, wallet.address],
            }
          : c
      ),
    };

    const updated = state.challenges.find(
      (c) => c.id === challengeId
    );

    if (updated) {
      state.selectedChallenge = updated;
    }

    persist();
    emit();
  },

  startStream: (input: {
    topic: Topic;
    title: string;
    targetSol: number;
  }) => {
    if (!state.wallet || !state.profile) {
      throw new Error("Wallet + profile required");
    }

    const wallet = state.wallet;
    const profile = state.profile;

    const hasChallenge = state.selectedChallenge !== null;

    const stream: LiveStream = {
      id: `local_${Date.now()}`,
      ownerWallet: wallet.address,
      handle: profile.handle,
      displayName: profile.displayName,
      topic: input.topic,
      title: hasChallenge
        ? `[Challenge] ${input.title}`
        : input.title,
      startedAt: Date.now(),
      isLive: true,
      potSol: 0,
      targetSol: input.targetSol,
      viewers: 0,
    };

    state = {
      ...state,
      streams: [stream, ...state.streams],
    };

    persist();
    emit();

    const battle = checkAndQueueCreator(
      stream.id,
      wallet.address,
      profile.handle,
      profile.displayName,
      "https://randomuser.me/api/portraits/lego/1.jpg",
      input.topic,
      input.title,
      input.targetSol,
      0
    );

    if (battle) {
      state = {
        ...state,
        activeBattle: battle,
      };

      persist();
      emit();
    }

    return stream;
  },

  endStream: (id: string) => {
    state = {
      ...state,
      streams: state.streams.map((s) =>
        s.id === id
          ? {
              ...s,
              isLive: false,
            }
          : s
      ),
    };

    persist();
    emit();
  },

  updateStreamPot: (streamId: string, amount: number) => {
    if (!state.wallet || !state.profile) {
      return null;
    }

    const wallet = state.wallet;
    const profile = state.profile;

    state.streams = state.streams.map((s) =>
      s.id === streamId
        ? {
            ...s,
            potSol: s.potSol + amount,
          }
        : s
    );

    const stream = state.streams.find(
      (s) => s.id === streamId
    );

    if (!stream) {
      return null;
    }

    const battle = checkAndQueueCreator(
      streamId,
      wallet.address,
      profile.handle,
      profile.displayName,
      "https://randomuser.me/api/portraits/lego/1.jpg",
      stream.topic,
      stream.title,
      stream.targetSol,
      stream.potSol
    );

    if (battle) {
      state = {
        ...state,
        activeBattle: battle,
      };

      persist();
      emit();

      return battle;
    }

    persist();
    emit();

    return null;
  },

  sendBattleTip: (
    battleId: string,
    amount: number,
    targetCreator: string
  ) => {
    const battle = updateBattleTips(
      battleId,
      targetCreator,
      amount
    );

    if (battle) {
      state = {
        ...state,
        activeBattle: battle,
      };

      persist();
      emit();
    }

    return battle;
  },

  endBattle: (battleId: string) => {
    const battle = endBattle(battleId);

    if (battle) {
      state = {
        ...state,
        activeBattle: null,
      };

      persist();
      emit();
    }

    return battle;
  },

  getActiveBattle: () => {
    if (!state.wallet) {
      return null;
    }

    const wallet = state.wallet;

    const battle = getActiveBattleForCreator(
      wallet.address
    );

    if (battle) {
      state = {
        ...state,
        activeBattle: battle,
      };

      persist();
      emit();
    }

    return battle;
  },
};

export function useSochal() {
  return useSyncExternalStore(
    sochal.subscribe,
    () => sochal.get(),
    () => initial
  );
}

export const shortAddr = (a: string) =>
  `${a.slice(0, 4)}…${a.slice(-4)}`;