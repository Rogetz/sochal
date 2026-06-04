"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  Battle,
  getActiveBattleForCreator,
  updateBattleTips,
  endBattle,
  checkAndQueueCreator,
} from "./battle-service";
import { getWallets } from "@wallet-standard/app";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import {
  StandardConnect,
  StandardDisconnect,
} from "@wallet-standard/features";
import { CHALLENGE_STAGE_CAPACITY } from "./challenge-stages";

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
  onChainAddress?: string;
  challengeId?: string;
  handle: string;
  displayName: string;
  topic: Topic;
  title: string;
  startedAt: number;
  isLive: boolean;
  potSol: number;
  targetSol: number;
  viewers: number;
  battle?: Battle | null;
}

export interface Challenge {
  id: string;
  topic: Topic;
  title: string;
  description: string;
  creatorId: string;
  targetMin: number;
  maxCreators: number;
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

export interface WalletStandardSession {
  wallet: Wallet;
  account: WalletAccount;
  provider: WalletProvider;
}

type BackendChallengePayload = {
  id: string;
  topic: Topic;
  title: string;
  description: string;
  creatorWalletAddress?: string;
  creatorId?: string;
  targetMin?: number | string;
  maxCreators?: number | string;
  creators?: Array<{
    creatorWalletAddress: string;
    status?: string;
    joinedAt?: string | number;
    liveStreamId?: string | null;
  }>;
  status?: string;
  createdAt: string | number;
  endsAt?: string | number | null;
};

type BackendBattlePayload = {
  id: string;
  creatorA: string;
  creatorAHandle: string;
  creatorAName: string;
  creatorAAvatar: string;
  creatorB: string | null;
  creatorBHandle: string | null;
  creatorBName: string | null;
  creatorBAvatar: string | null;
  topic: string;
  title: string;
  targetSol: number | string;
  currentSol: number | string;
  tipsA: number | string;
  tipsB: number | string;
  status: "active" | "completed" | "waiting" | "matching";
  winner: string | null;
  winnerHandle: string | null;
  startedAt: string | number | Date;
  pairedAt: string | number | Date | null;
  endedAt: string | number | Date | null;
  viewersA: number | string;
  viewersB: number | string;
};

const KEY = "sochal:state:v2";

type PersistedSochalState = Pick<
  SochalState,
  "wallet" | "profile" | "role" | "topic"
>;

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
let walletStandardSession: WalletStandardSession | null = null;

if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(KEY);

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedSochalState>;

      state = {
        ...initial,
        wallet: parsed.wallet ?? null,
        profile: parsed.profile ?? null,
        role: parsed.role ?? null,
        topic: parsed.topic ?? null,
      };

      localStorage.setItem(
        KEY,
        JSON.stringify({
          wallet: state.wallet,
          profile: state.profile,
          role: state.role,
          topic: state.topic,
        } satisfies PersistedSochalState)
      );
    }
  } catch {}
}
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((l) => l());
};

const persist = () => {
  if (typeof window !== "undefined") {
    const persistedState: PersistedSochalState = {
      wallet: state.wallet,
      profile: state.profile,
      role: state.role,
      topic: state.topic,
    };

    localStorage.setItem(KEY, JSON.stringify(persistedState));
  }
};

const normalizeBattle = (battle: BackendBattlePayload): Battle => ({
  ...battle,
  topic: battle.topic,
  targetSol: Number(battle.targetSol),
  currentSol: Number(battle.currentSol),
  tipsA: Number(battle.tipsA),
  tipsB: Number(battle.tipsB),
  status: battle.status,
  startedAt: new Date(battle.startedAt as string),
  pairedAt: battle.pairedAt ? new Date(battle.pairedAt as string) : null,
  endedAt: battle.endedAt ? new Date(battle.endedAt as string) : null,
  viewersA: Number(battle.viewersA),
  viewersB: Number(battle.viewersB),
});

const mapChallenge = (challenge: BackendChallengePayload): Challenge => ({
  id: challenge.id,
  topic: challenge.topic,
  title: challenge.title,
  description: challenge.description,
  creatorId: challenge.creatorWalletAddress ?? challenge.creatorId ?? "",
  targetMin: Number(challenge.targetMin ?? 0),
  maxCreators: Number(
    challenge.maxCreators ?? CHALLENGE_STAGE_CAPACITY.ROUND_OF_32
  ),
  participants: (challenge.creators ?? []).map((creator) => creator.creatorWalletAddress),
  status: (challenge.status ?? "waiting").toLowerCase() as Challenge["status"],
  createdAt: new Date(challenge.createdAt).getTime(),
  endsAt: challenge.endsAt ? new Date(challenge.endsAt).getTime() : Date.now() + 24 * 60 * 60 * 1000,
});

const mapLiveStream = (stream: {
  id: string;
  ownerWallet: string;
  onChainAddress?: string;
  challengeId?: string;
  handle: string;
  displayName: string;
  topic: Topic;
  title: string;
  startedAt: number;
  isLive: boolean;
  potSol: number;
  targetSol: number;
  viewers: number;
  battle?: BackendBattlePayload | null;
}): LiveStream => ({
  id: stream.id,
  ownerWallet: stream.ownerWallet,
  onChainAddress: stream.onChainAddress,
  challengeId: stream.challengeId,
  handle: stream.handle,
  displayName: stream.displayName,
  topic: stream.topic,
  title: stream.title,
  startedAt: stream.startedAt,
  isLive: stream.isLive,
  potSol: stream.potSol,
  targetSol: stream.targetSol,
  viewers: stream.viewers,
  battle: stream.battle ? normalizeBattle(stream.battle) : null,
});

const ACTIVE_CHALLENGE_STATUSES = new Set(["PENDING", "QUALIFIED"]);

function getPersistedChallengeIdForWallet(
  challenges: BackendChallengePayload[],
  walletAddress: string | null | undefined
) {
  if (!walletAddress) return null;

  const matches = challenges.flatMap((challenge) =>
    (challenge.creators ?? [])
      .filter((creator) =>
        creator.creatorWalletAddress === walletAddress &&
        ACTIVE_CHALLENGE_STATUSES.has(String(creator.status ?? "").toUpperCase())
      )
      .map((creator) => ({
        challengeId: challenge.id,
        joinedAt: creator.joinedAt ? new Date(creator.joinedAt).getTime() : 0,
      }))
  );

  matches.sort((left, right) => right.joinedAt - left.joinedAt);

  return matches[0]?.challengeId ?? null;
}

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

function normalizeProviderName(name: string) {
  return name.toLowerCase().trim();
}

function getWalletStandardByProvider(
  provider: WalletProvider
): Wallet | null {
  if (typeof window === "undefined") return null;

  const target = normalizeProviderName(provider);
  const wallets = getWallets().get();

  return (
    wallets.find((wallet) =>
      normalizeProviderName(wallet.name).includes(target)
    ) ?? null
  );
}

function setWalletStandardSession(
  session: WalletStandardSession | null
) {
  walletStandardSession = session;
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
    const standardWallet = getWalletStandardByProvider(provider);

    if (
      standardWallet &&
      StandardConnect in standardWallet.features
    ) {
      const connectFeature = standardWallet.features[
        StandardConnect
      ] as {
        connect: (input?: { silent?: boolean }) => Promise<{
          accounts: readonly WalletAccount[];
        }>;
      };

      const output = await connectFeature.connect();
      const account =
        output.accounts[0] ?? standardWallet.accounts[0];

      if (account?.address) {
        state = {
          ...state,
          wallet: {
            address: account.address,
            provider,
          },
        };

        setWalletStandardSession({
          wallet: standardWallet,
          account,
          provider,
        });

        persist();
        emit();
        return;
      }
    }

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

    const fallbackStandardWallet = getWalletStandardByProvider(provider);
    const fallbackAccount = fallbackStandardWallet?.accounts.find(
      (item) => item.address === address
    ) ?? fallbackStandardWallet?.accounts[0];

    if (fallbackStandardWallet && fallbackAccount) {
      setWalletStandardSession({
        wallet: fallbackStandardWallet,
        account: fallbackAccount,
        provider,
      });
    } else {
      setWalletStandardSession(null);
    }

    persist();
    emit();
  },

  disconnect: async () => {
    if (
      walletStandardSession &&
      StandardDisconnect in walletStandardSession.wallet.features
    ) {
      try {
        const disconnectFeature = walletStandardSession.wallet
          .features[StandardDisconnect] as {
          disconnect: () => Promise<void>;
        };
        await disconnectFeature.disconnect();
      } catch {}
    }

    if (state.wallet) {
      try {
        await getInjected(state.wallet.provider)?.disconnect();
      } catch {}
    }

    setWalletStandardSession(null);

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

  createChallenge: async (
    challenge: Omit<
      Challenge,
      "id" | "createdAt" | "status" | "participants"
    >
  ): Promise<Challenge> => {
    if (!state.wallet) {
      throw new Error("Wallet required");
    }

    const wallet = state.wallet;
    const profile = state.profile;

    try {
      const response = await fetch("/api/challenges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creatorWalletAddress: wallet.address,
          creatorHandle: profile?.handle,
          creatorDisplayName: profile?.displayName,
          topic: challenge.topic,
          title: challenge.title,
          description: challenge.description,
          targetMin: challenge.targetMin,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || "Failed to store challenge");
      }

      const payload = (await response.json()) as {
        challenge?: any;
      };

      const serverChallenge = payload.challenge;

      const newChallenge: Challenge = {
        id: serverChallenge?.id ?? `ch_${Date.now()}`,
        topic: (serverChallenge?.topic ?? challenge.topic) as Topic,
        title: serverChallenge?.title ?? challenge.title,
        description: serverChallenge?.description ?? challenge.description,
        creatorId:
          serverChallenge?.creatorWalletAddress ??
          serverChallenge?.creatorId ??
          wallet.address,
        targetMin: Number(serverChallenge?.targetMin ?? challenge.targetMin),
        maxCreators: Number(
          serverChallenge?.maxCreators ?? CHALLENGE_STAGE_CAPACITY.ROUND_OF_32
        ),
        participants: (serverChallenge?.creators ?? []).map((cr: any) =>
          cr.creatorWalletAddress
        ),
        status: (serverChallenge?.status ?? "waiting").toLowerCase(),
        createdAt: serverChallenge?.createdAt
          ? new Date(serverChallenge.createdAt).getTime()
          : Date.now(),
        endsAt: serverChallenge?.endsAt
          ? new Date(serverChallenge.endsAt).getTime()
          : Date.now() + 24 * 60 * 60 * 1000,
      };

    state = {
      ...state,
      challenges: [newChallenge, ...state.challenges],
      selectedChallenge: null,
    };

    persist();
    emit();

      await sochal.loadChallenges();

      return newChallenge;
    } catch (error) {
      console.error("Failed to create challenge in database:", error);

      const fallbackChallenge: Challenge = {
        ...challenge,
        id: `ch_${Date.now()}`,
        maxCreators: CHALLENGE_STAGE_CAPACITY.ROUND_OF_32,
        participants: [],
        status: "waiting",
        createdAt: Date.now(),
        endsAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      state = {
        ...state,
        challenges: [fallbackChallenge, ...state.challenges],
        selectedChallenge: null,
      };

      persist();
      emit();

      await sochal.loadChallenges();

      return fallbackChallenge;
    }
  },

  setSelectedChallenge: (challenge: Challenge | null) => {
    state = {
      ...state,
      selectedChallenge: challenge,
    };

    persist();
    emit();
  },

  loadChallenges: async () => {
    try {
      const resp = await fetch("/api/challenges", { cache: "no-store" });

      if (!resp.ok) {
        return;
      }

      const payload = (await resp.json()) as {
        challenges?: BackendChallengePayload[];
      };

      const backendChallenges = payload.challenges ?? [];
      const challenges: Challenge[] = backendChallenges.map(mapChallenge);

      const existingChallenges = state.challenges;
      const mergedChallenges = [
        ...challenges,
        ...existingChallenges.filter(
          (existing) => !challenges.some((challenge) => challenge.id === existing.id)
        ),
      ];

      state = {
        ...state,
        challenges: mergedChallenges,
      };

      persist();
      emit();
    } catch (err) {
      console.error("Failed to load challenges:", err);
    }
  },

  refreshFromBackend: async () => {
    try {
      const [challengesResponse, streamsResponse] = await Promise.all([
        fetch("/api/challenges", { cache: "no-store" }),
        fetch("/api/live-streams", { cache: "no-store" }),
      ]);

      const challengesPayload = challengesResponse.ok
        ? ((await challengesResponse.json()) as { challenges?: BackendChallengePayload[] })
        : { challenges: [] };

      const streamsPayload = streamsResponse.ok
        ? ((await streamsResponse.json()) as {
            streams?: Array<{
              id: string;
              ownerWallet: string;
              onChainAddress?: string;
              challengeId?: string;
              handle: string;
              displayName: string;
              topic: Topic;
              title: string;
              startedAt: number;
              isLive: boolean;
              potSol: number;
              targetSol: number;
              viewers: number;
              battle?: BackendBattlePayload | null;
            }>;
          })
        : { streams: [] };

      const backendChallenges = challengesPayload.challenges ?? [];
      const challenges = backendChallenges.map(mapChallenge);
      const streams = (streamsPayload.streams ?? []).map(mapLiveStream);

      const selectedChallengeId =
        state.selectedChallenge?.id ??
        getPersistedChallengeIdForWallet(backendChallenges, state.wallet?.address);
      const selectedChallenge =
        challenges.find((challenge) => challenge.id === selectedChallengeId) ?? null;
      const activeBattle =
        streams.find((stream) => stream.battle)?.battle ?? null;

      state = {
        ...state,
        challenges,
        streams,
        selectedChallenge,
        activeBattle,
      };

      persist();
      emit();
    } catch (error) {
      console.error("Failed to refresh backend state:", error);
    }
  },

  joinChallenge: async (challengeId: string) => {
    if (!state.wallet) return;

    const wallet = state.wallet;

    try {
      await fetch(`/api/challenges/${challengeId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creatorWalletAddress: wallet.address,
          creatorHandle: state.profile?.handle,
          creatorDisplayName: state.profile?.displayName,
        }),
      });
    } catch (error) {
      console.error("Failed to persist challenge join:", error);
    }

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

    // Show a visual confirmation to the user
    try {
      toast.success("Joined challenge");
    } catch {}
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

  getWalletStandardSession: async () => {
    if (!state.wallet) return null;

    if (
      walletStandardSession &&
      walletStandardSession.provider === state.wallet.provider &&
      walletStandardSession.account.address === state.wallet.address
    ) {
      return walletStandardSession;
    }

    const standardWallet = getWalletStandardByProvider(
      state.wallet.provider
    );
    if (!standardWallet) return null;

    if (StandardConnect in standardWallet.features) {
      const connectFeature = standardWallet.features[
        StandardConnect
      ] as {
        connect: (input?: { silent?: boolean }) => Promise<{
          accounts: readonly WalletAccount[];
        }>;
      };

      // First try silent re-attach, then fallback to regular connect.
      const output = await connectFeature
        .connect({ silent: true })
        .catch(() => connectFeature.connect());

      const account =
        output.accounts.find(
          (item) => item.address === state.wallet?.address
        ) ??
        standardWallet.accounts.find(
          (item) => item.address === state.wallet?.address
        ) ??
        output.accounts[0] ??
        standardWallet.accounts[0];

      if (account) {
        const session = {
          wallet: standardWallet,
          account,
          provider: state.wallet.provider,
        } satisfies WalletStandardSession;

        setWalletStandardSession(session);

        if (state.wallet.address !== account.address) {
          state = {
            ...state,
            wallet: {
              ...state.wallet,
              address: account.address,
            },
          };
          persist();
          emit();
        }

        return session;
      }
    }

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
    const endedBattle = endBattle(battleId);

    if (endedBattle || state.activeBattle?.id === battleId) {
      state = {
        ...state,
        activeBattle: null,
      };

      persist();
      emit();
    }

    return endedBattle;
  },

  setActiveBattle: (battle: Battle | null) => {
    state = {
      ...state,
      activeBattle: battle,
    };

    persist();
    emit();
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