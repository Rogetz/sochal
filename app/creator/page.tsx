"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import {
  useSochal,
  sochal,
  type Topic,
} from "@/lib/sochal-store";
import { CHALLENGE_STAGE_CAPACITY } from "@/lib/challenge-stages";
import { createLiveOnChain } from "@/lib/solana-live";

import { TopicBadge } from "@/components/sochal/TopicBadge";
import { SolAmount } from "@/components/sochal/SolAmount";
import { ProfileSetupDialog } from "@/components/sochal/ProfileSetupDialog";

import Image from "next/image";
import { GoLiveModal } from "@/components/sochal/live/GoLiveModal";
import { CreateReelModal } from "@/components/sochal/live/CreateReelModal";
import type { CreatedReelData } from "@/components/sochal/live/CreateReelModal";
import dynamic from "next/dynamic";

const SimpleAgoraStream = dynamic(
  () => import("@/components/sochal/live/SimpleAgoraStream"),
  {
    ssr: false,
  }
);
import { addUserReel, getUserReels, type MockReel } from "@/lib/mock-data";

import {
  Radio,
  Trophy,
  Coins,
  TrendingUp,
  UserCircle2,
  Target,
  Plus,
  Video,
  Sparkles,
  ChevronDown,
  ChevronUp,
  UsersRound,
  Clock,
  Swords,
} from "lucide-react";

type UpcomingBattle = {
  id: string;
  challengeId: string;
  challengeTitle: string;
  topic: string;
  scheduledAt: string;
  isDue: boolean;
  canEnterBattle: boolean;
  currentSol: number;
  targetSol: number;
  battleStatus: "active" | "completed";
  creatorA: {
    walletAddress: string;
    displayName: string;
    handle?: string | null;
    avatar: string;
  };
  creatorB: {
    walletAddress: string;
    displayName: string;
    handle?: string | null;
    avatar: string;
  };
};

type QualifiedCreator = {
  challengeId: string;
  challengeTitle: string;
  topic: string;
  creatorWalletAddress: string;
  creatorDisplayName: string;
  creatorHandle?: string | null;
  creatorAvatar: string;
  qualifiedAt: string | null;
};

export default function CreatorStudio() {
  const {
    wallet,
    profile,
    streams,
    challenges,
    selectedChallenge,
    activeBattle,
  } = useSochal();

  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const [showCreateReel, setShowCreateReel] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [showAgoraStream, setShowAgoraStream] = useState(false);
  const [currentChannel, setCurrentChannel] = useState("");
  const [currentLiveAddress, setCurrentLiveAddress] = useState("");
  const [isStartingLive, setIsStartingLive] = useState(false);
  const goLiveLockRef = useRef(false);

  const [showDashboard, setShowDashboard] = useState(true);
  const [challengeTab, setChallengeTab] = useState<"your" | "all" | "battle">("your");
  const [assignedBattles, setAssignedBattles] = useState<UpcomingBattle[]>([]);
  const [qualifiedCreators, setQualifiedCreators] = useState<QualifiedCreator[]>([]);
  const [, setRenderTimestamp] = useState<number>(() => Date.now());

  const router = useRouter();

  const enterBattle = async (battleId: string) => {
    try {
      const response = await fetch(`/api/battles/${battleId}`, { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Failed to load battle");
      }

      const payload = await response.json();
      if (payload?.battle) {
        sochal.setActiveBattle(payload.battle);
        router.push(`/battles/${payload.battle.id}`);
      }
    } catch (error) {
      console.warn("Failed to enter battle:", error);
      toast.error("Unable to enter the battle right now.");
    }
  };

  const visibleChallengeTab: "your" | "all" | "battle" =
    assignedBattles.length > 0 && challengeTab === "your" ? "battle" : challengeTab;

  useEffect(() => {
    // Load challenges (all) so creators can browse and join existing ones.
    sochal.loadChallenges?.();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRenderTimestamp(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!wallet) return;

    let active = true;

    const loadBattleTab = async () => {
      try {
        const response = await fetch(
          `/api/battles/upcoming?creatorWallet=${encodeURIComponent(wallet.address)}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Failed to load battle tab");
        }

        const payload = await response.json();

        if (!active) return;

        setAssignedBattles(Array.isArray(payload.battles) ? payload.battles : []);
        setQualifiedCreators(
          Array.isArray(payload.qualifiedCreators) ? payload.qualifiedCreators : []
        );
      } catch {
        if (!active) return;
        setAssignedBattles([]);
        setQualifiedCreators([]);
      }
    };

    loadBattleTab();
    const interval = setInterval(loadBattleTab, 8000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [wallet]);

  const handleManualRefresh = async () => {
    if (!wallet) return;

    try {
      await sochal.refreshFromBackend();

      const response = await fetch(
        `/api/battles/upcoming?creatorWallet=${encodeURIComponent(wallet.address)}`,
        { cache: "no-store" }
      );

      if (response.ok) {
        const payload = await response.json();
        setAssignedBattles(Array.isArray(payload.battles) ? payload.battles : []);
        setQualifiedCreators(Array.isArray(payload.qualifiedCreators) ? payload.qualifiedCreators : []);
      }
    } catch (e) {
      console.warn("Manual refresh failed:", e);
    }
  };

  const [createdReels, setCreatedReels] = useState<MockReel[]>([]);

  const myReels = useMemo(() => {
    if (!wallet) return [];

    return [...createdReels, ...getUserReels(wallet.address)];
  }, [createdReels, wallet]);

  const myStreams = useMemo(() => {
    if (!wallet) return [];
    return streams.filter((s) => s.ownerWallet === wallet.address);
  }, [streams, wallet]);

  const lifetime = myStreams.reduce((acc, s) => acc + s.potSol, 0);

  const lastEarned = myStreams[0]?.potSol ?? 0;

  const wins = 0;

  const myChallenges = useMemo(() => {
    if (!wallet) return [];

    return challenges.filter(
      (c) => c.creatorId === wallet.address
    );
  }, [wallet, challenges]);

  const availableChallenges = useMemo(() => {
    if (!wallet) return [];

    return challenges.filter(
      (c) =>
        c.status === "waiting" &&
        !c.participants.includes(wallet.address)
    );
  }, [wallet, challenges]);

  const handleCreateChallenge = async (
    topic: Topic,
    title: string,
    description: string,
    targetMin: number
  ) => {
    if (!wallet) return;

    await sochal.createChallenge({
      topic,
      title,
      description,
      creatorId: wallet.address,
      targetMin,
      maxCreators: CHALLENGE_STAGE_CAPACITY.ROUND_OF_32,
      endsAt: Date.now() + 1000 * 60 * 60 * 24,
    });

    setShowGoLiveModal(false);
  };

  const handleReelCreated = (reelData: CreatedReelData) => {
    if (!wallet || !profile) return;

    const newReel = addUserReel({
      creatorId: wallet.address,
      creatorName: profile.displayName,
      creatorHandle: profile.handle,
      creatorAvatar:
        "https://randomuser.me/api/portraits/lego/1.jpg",
      videoUrl: URL.createObjectURL(reelData.videoFile),
      thumbnailUrl: reelData.thumbnail,
      description: reelData.description,
      topic: reelData.topic,
      isLive: false,
    });

    setCreatedReels((prev) => [newReel, ...prev]);

    toast.success("Reel created successfully.");
  };

  async function handleStartAgoraStream(): Promise<void> {
    if (!selectedChallenge || !wallet || !profile) return;
    if (goLiveLockRef.current) return;

    goLiveLockRef.current = true;
    setIsStartingLive(true);

    try {
      const { liveAddress } = await createLiveOnChain({
        topic: selectedChallenge.topic,
      });

      const channel = `battle_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const response = await fetch("/api/lives", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          streamId: channel,
          channelName: channel,
          onChainAddress: String(liveAddress),
          ownerWalletAddress: wallet.address,
          creatorHandle: profile.handle,
          creatorDisplayName: profile.displayName,
          challengeId: selectedChallenge.id,
          topic: selectedChallenge.topic,
          title: selectedChallenge.title,
          targetSol: selectedChallenge.targetMin,
          totalCollectedSol: 0,
          status: "ACTIVE",
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.error || "Failed to persist live stream metadata"
        );
      }

      setCurrentChannel(channel);
      setCurrentLiveAddress(String(liveAddress));
      setShowAgoraStream(true);
      toast.success(`Live stream ready. Session ${liveAddress} created.`);

    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create live stream on-chain.";
      toast.error(`Unable to start live stream: ${message}`);
      goLiveLockRef.current = false;
      setIsStartingLive(false);
    }
  }

  const handleEndAgoraStream = () => {
    setShowAgoraStream(false);
    setCurrentChannel("");
    setCurrentLiveAddress("");
    goLiveLockRef.current = false;
    setIsStartingLive(false);
  };

  if (!wallet) {
    return (
      <div className="mx-auto max-w-md py-32 text-center">
        <h2 className="text-3xl font-bold text-white">
          Connect Wallet
        </h2>

        <p className="mt-3 text-gray-400">
          Connect your wallet to start streaming.
        </p>

        <Link href="/">
          <Button className="mt-6">
            Back Home
          </Button>
        </Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-md py-32 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-primary/20">
          <UserCircle2 className="h-8 w-8 text-primary" />
        </div>

        <h2 className="text-3xl font-bold text-white">
          Create Creator Profile
        </h2>

        <p className="mt-3 text-gray-400">
          Create your public creator identity.
        </p>

        <Button
          onClick={() => setProfileOpen(true)}
          className="mt-6"
        >
          Setup Profile
        </Button>

        <ProfileSetupDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
        />
      </div>
    );
  }

  if (showAgoraStream) {
    return (
      <SimpleAgoraStream
        channelName={currentChannel}
        role="host"
        userName={profile.displayName}
        hostMetadata={
          selectedChallenge
            ? {
                ownerWallet: wallet.address,
                handle: profile.handle,
                onChainAddress: currentLiveAddress,
                challengeId: selectedChallenge.id,
                topic: selectedChallenge.topic,
                title: selectedChallenge.title,
                targetSol: selectedChallenge.targetMin,
              }
            : undefined
        }
        onEnd={handleEndAgoraStream}
      />
    );
  }

  /*
  if (
    activeBattle &&
    new Date(activeBattle.pairedAt as unknown as string).getTime() <= renderTimestamp
  ) {
    return (
      <BattleView
        battle={activeBattle}
        currentCreatorWallet={wallet.address}
        onEnd={() => sochal.endBattle(activeBattle.id)}
        onSendTip={(amount, creatorWallet) =>
          sochal.sendBattleTip(activeBattle.id, amount, creatorWallet)
        }
      />
    );
  }*/

  const stats = [
    {
      icon: Coins,
      label: "Lifetime Earned",
      value: lifetime,
    },
    {
      icon: TrendingUp,
      label: "Last Stream",
      value: lastEarned,
    },
    {
      icon: Trophy,
      label: "Wins",
      value: wins,
      isCount: true,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-primary">
            @{profile.handle}
          </p>

          <h1 className="text-4xl font-bold text-white">
            Creator Studio
          </h1>

          <p className="mt-1 text-gray-400">
            Create reels, go live and earn SOL.
          </p>
        </div>
          <div className="absolute top-5 right-4">
            <Button variant="ghost" onClick={handleManualRefresh}>Refresh</Button>
          </div>
        <Button
          variant="outline"
          onClick={() =>
            setShowDashboard(!showDashboard)
          }
        >
          {showDashboard ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" />
              Hide
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 h-4 w-4" />
              Show
            </>
          )}
        </Button>
      </div>

      {selectedChallenge && (
        <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-xs text-green-400">ACTIVE CHALLENGE</p>
              <p className="font-semibold text-white">{selectedChallenge.title}</p>
              <p className="text-xs text-gray-400">#{selectedChallenge.topic} · {selectedChallenge.targetMin} SOL target</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sochal.setSelectedChallenge(null)}
              className="ml-auto border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4">
        <Button
          onClick={() => setShowCreateReel(true)}
          className="h-28 rounded-2xl bg-purple-600 text-white hover:bg-purple-700"
        >
          <div className="flex flex-col items-center gap-2">
            <Video className="h-8 w-8" />
            <span>Create Reel</span>
          </div>
        </Button>

        <Button
          disabled={!selectedChallenge || isStartingLive}
          onClick={handleStartAgoraStream}
          className={`h-28 rounded-2xl ${
            selectedChallenge && !isStartingLive
              ? "bg-gradient-primary shadow-glow"
              : "opacity-50 cursor-not-allowed"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <Radio className="h-8 w-8" />
            <span className="font-semibold">
              {isStartingLive
                ? "Starting Live..."
                : selectedChallenge
                ? "Go Live"
                : "Select Challenge First"}
            </span>
            <span className="text-xs opacity-80">Powered by Agora</span>
          </div>
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-surface p-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="size-5 text-yellow-400" />
          <h3 className="font-semibold text-white">Live Streaming Tips</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <div className="size-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-[10px] font-bold">1</div>
            <div>
              <p className="text-white text-sm">Select a Challenge</p>
              <p className="text-gray-400 text-xs">Choose from your challenges below</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="size-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-[10px] font-bold">2</div>
            <div>
              <p className="text-white text-sm">Go Live</p>
              <p className="text-gray-400 text-xs">Camera & mic will activate</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="size-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-[10px] font-bold">3</div>
            <div>
              <p className="text-white text-sm">Earn SOL</p>
              <p className="text-gray-400 text-xs">Receive tips from fans in real-time</p>
            </div>
          </div>
        </div>
      </div>

      {showDashboard && (
        <>
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {item.label}
                  </span>

                  <item.icon className="h-4 w-4 text-primary" />
                </div>

                <div className="mt-4 text-3xl font-bold text-white">
                  {item.isCount ? (
                    item.value
                  ) : (
                    <SolAmount value={item.value} />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">Challenges</h2>
                    <div className="ml-4 inline-flex rounded-md bg-zinc-900 p-1">
                      <button
                        className={`px-3 py-1 text-sm rounded ${visibleChallengeTab === "your" ? "bg-primary text-black" : "text-white/80"}`}
                        onClick={() => setChallengeTab("your")}
                      >Your Challenges</button>
                      <button
                        className={`px-3 py-1 text-sm rounded ${visibleChallengeTab === "all" ? "bg-primary text-black" : "text-white/80"}`}
                        onClick={() => setChallengeTab("all")}
                      >All Challenges</button>
                      <button
                        className={`px-3 py-1 text-sm rounded ${visibleChallengeTab === "battle" ? "bg-primary text-black" : "text-white/80"}`}
                        onClick={() => setChallengeTab("battle")}
                      >Battle Tab</button>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setShowGoLiveModal(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Challenge
                </Button>
              </div>

              {(() => {
                if (visibleChallengeTab === "battle") {
                  return (
                    <div className="space-y-6">
                      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
                        <div className="flex items-center gap-2">
                          <Swords className="h-4 w-4 text-blue-300" />
                          <p className="text-sm font-semibold text-white">Assigned Battle Pair</p>
                        </div>

                        {assignedBattles.length === 0 && activeBattle == null ? (
                          <p className="mt-3 text-sm text-gray-400">
                            No battle assignment yet. Once another qualified creator is matched, the platform will show your pair and schedule here.
                          </p>
                        ) : (
                          <div className="mt-4 space-y-3">
                            {activeBattle ? (
                              <div key={activeBattle.id} className="rounded-2xl border border-gray-700 bg-black/40 p-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Active Battle</p>
                                <p className="mt-1 text-sm font-semibold text-white">
                                  {activeBattle.title || "Battle challenge"}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">Topic: {activeBattle.topic || "Unknown"}</p>

                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                  <div className="rounded-2xl border border-gray-800 bg-zinc-950/80 p-3">
                                    <div className="flex items-center gap-3">
                                      <Image
                                        src={activeBattle.creatorAAvatar || "/images/avatar-fallback.png"}
                                        alt={activeBattle.creatorAName || "Creator A"}
                                        width={44}
                                        height={44}
                                        className="rounded-full object-cover"
                                        unoptimized
                                      />
                                      <div>
                                        <p className="text-sm font-semibold text-white">{activeBattle.creatorAName || activeBattle.creatorA}</p>
                                        <p className="text-xs text-gray-400">
                                          {activeBattle.creatorAHandle ? `@${activeBattle.creatorAHandle}` : activeBattle.creatorA}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between text-sm text-amber-300">
                                      <span>Tips</span>
                                      <span>{(activeBattle.tipsA ?? 0).toFixed(1)} SOL</span>
                                    </div>
                                  </div>

                                  <div className="rounded-2xl border border-gray-800 bg-zinc-950/80 p-3">
                                    <div className="flex items-center gap-3">
                                      <Image
                                        src={activeBattle.creatorBAvatar || "/images/avatar-fallback.png"}
                                        alt={activeBattle.creatorBName || "Creator B"}
                                        width={44}
                                        height={44}
                                        className="rounded-full object-cover"
                                        unoptimized
                                      />
                                      <div>
                                        <p className="text-sm font-semibold text-white">{activeBattle.creatorBName || activeBattle.creatorB || "Waiting for opponent"}</p>
                                        <p className="text-xs text-gray-400">
                                          {activeBattle.creatorBHandle ? `@${activeBattle.creatorBHandle}` : activeBattle.creatorB || ""}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between text-sm text-amber-300">
                                      <span>Tips</span>
                                      <span>{(activeBattle.tipsB ?? 0).toFixed(1)} SOL</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">
                                  <div className="flex items-center justify-between">
                                    <span>Progress</span>
                                    <span>{(activeBattle.currentSol ?? 0).toFixed(1)} / {(activeBattle.targetSol ?? 0).toFixed(1)} SOL</span>
                                  </div>
                                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400"
                                      style={{ width: `${activeBattle.targetSol ? Math.min(100, ((activeBattle.currentSol ?? 0) / activeBattle.targetSol) * 100) : 0}%` }}
                                    />
                                  </div>
                                </div>

                                <Button
                                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700"
                                  onClick={() => enterBattle(activeBattle.id)}
                                >
                                  Enter Challenge
                                </Button>
                              </div>
                            ) : null}
                            {assignedBattles.map((battle) => {
                              const meIsA = battle.creatorA.walletAddress === wallet.address;
                              const opponent = meIsA ? battle.creatorB : battle.creatorA;
                              return (
                                <div key={battle.id} className="rounded-xl border border-gray-700 bg-black/40 p-3">
                                  <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Scheduled Battle</p>
                                  <p className="mt-1 text-sm font-semibold text-white">{battle.challengeTitle}</p>
                                  <p className="mt-1 text-xs text-gray-400">Topic: {battle.topic}</p>
                                  <div className="mt-3 flex items-center gap-3">
                                    <Image src={opponent.avatar || "/images/avatar-fallback.png"} alt="" width={40} height={40} className="rounded-full object-cover" unoptimized />
                                    <div>
                                      <p className="text-sm text-white">Opponent: {opponent.displayName}</p>
                                      <p className="text-xs text-gray-400">{opponent.handle ? `@${opponent.handle}` : opponent.walletAddress}</p>
                                    </div>
                                  </div>
                                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-amber-300">
                                      <span>
                                        {battle.battleStatus === "completed"
                                          ? "Battle completed"
                                          : battle.isDue
                                            ? "Battle is live"
                                            : `Scheduled for ${new Date(battle.scheduledAt).toLocaleString()}`}
                                      </span>
                                      <span>{battle.currentSol.toFixed(1)} / {battle.targetSol.toFixed(1)} SOL</span>
                                    </div>
                                    {battle.canEnterBattle && battle.battleStatus === "active" && (
                                      <Button
                                        className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
                                        onClick={() => enterBattle(battle.id)}
                                      >
                                        Enter Battle
                                      </Button>
                                    )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
                        <div className="flex items-center gap-2">
                          <UsersRound className="h-4 w-4 text-purple-300" />
                          <p className="text-sm font-semibold text-white">Qualified Creators In Battle Pool</p>
                        </div>

                        {qualifiedCreators.length === 0 ? (
                          <p className="mt-3 text-sm text-gray-400">No one has qualified into the battle pool yet.</p>
                        ) : (
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {qualifiedCreators.map((creator) => (
                              <div key={`${creator.challengeId}-${creator.creatorWalletAddress}`} className="rounded-xl border border-gray-700 bg-black/40 p-3">
                                <div className="flex items-center gap-3">
                                  <Image src={creator.creatorAvatar || "/images/avatar-fallback.png"} alt="" width={36} height={36} className="rounded-full object-cover" unoptimized />
                                  <div>
                                    <p className="text-sm font-semibold text-white">{creator.creatorDisplayName}</p>
                                    <p className="text-xs text-gray-400">{creator.creatorHandle ? `@${creator.creatorHandle}` : creator.creatorWalletAddress}</p>
                                  </div>
                                </div>
                                <p className="mt-2 text-xs text-gray-400">{creator.challengeTitle}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                const list = visibleChallengeTab === "your" ? myChallenges : challenges;

                if (!list || list.length === 0) {
                  return (
                    <div className="rounded-2xl border border-dashed border-gray-700 py-12 text-center">
                      <p className="text-gray-500">No challenges yet.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid gap-4 md:grid-cols-2">
                    {list.map((challenge) => (
                      <div
                        key={challenge.id}
                        onClick={() => sochal.setSelectedChallenge(challenge)}
                        className={`cursor-pointer rounded-2xl border p-5 transition-all ${
                          selectedChallenge?.id === challenge.id
                            ? "border-green-500 bg-green-500/10"
                            : "border-gray-800 bg-black/40 hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-white">{challenge.title}</h3>
                            {wallet && challenge.creatorId === wallet.address && (
                              <span className="rounded-full bg-primary/80 px-2 py-0.5 text-xs font-medium text-black">Your</span>
                            )}
                          </div>
                          <TopicBadge topic={challenge.topic} size="sm" />
                        </div>

                        <p className="mt-3 text-sm text-gray-400">{challenge.description}</p>

                        <div className="mt-4 flex items-center justify-between text-sm">
                          <span className="text-yellow-400">🎯 {challenge.targetMin} SOL</span>

                          <span className="text-green-400">
                            {challenge.status}
                          </span>
                        </div>

                        {/* Join CTA for All Challenges list when available */}
                        {visibleChallengeTab === "all" && wallet && challenge.status === "waiting" && !challenge.participants.includes(wallet.address) && (
                          <div className="mt-4">
                            <Button
                              size="sm"
                              className="w-full bg-green-600/20 text-green-400 hover:bg-green-600/30"
                              onClick={(e) => {
                                e.stopPropagation();
                                sochal.joinChallenge(challenge.id);
                              }}
                            >
                              Join Challenge →
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
            })()}

          </div>
          {availableChallenges.length > 0 && (
          
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-bold text-white">
                Join Existing Challenges
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {availableChallenges.map((challenge) => {
                  const slotsRemaining = Math.max(
                    0,
                    challenge.maxCreators - challenge.participants.length
                  );
                  return (
                    <div
                      key={challenge.id}
                      onClick={() => sochal.joinChallenge(challenge.id)}
                      className="cursor-pointer rounded-2xl border border-gray-800 bg-black/40 p-5 transition-all hover:border-green-500/40"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-white">
                            {challenge.title}
                          </h3>
                          <TopicBadge topic={challenge.topic} size="sm" />
                        </div>
                        <span className="text-xs text-yellow-400">
                          🎯 {challenge.targetMin} SOL
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-400">
                        {challenge.description}
                      </p>
                      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <UsersRound className="h-3 w-3" />
                          {slotsRemaining} slot{slotsRemaining !== 1 ? 's' : ''} remaining
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Open
                        </span>
                      </div>
                      <Button 
                        size="sm" 
                        className="mt-3 w-full bg-green-600/20 text-green-400 hover:bg-green-600/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          sochal.joinChallenge(challenge.id);
                        }}
                      >
                        Join Challenge →
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {myReels.length > 0 && (
            <div>
              <h2 className="mb-4 text-xl font-bold text-white">
                Recent Reels
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {myReels.slice(0, 3).map((reel) => (
                  <div key={reel.id} className="aspect-[9/16] overflow-hidden rounded-lg bg-gray-800">
                    <video src={reel.videoUrl} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <GoLiveModal
        isOpen={showGoLiveModal}
        onClose={() => setShowGoLiveModal(false)}
        onCreateChallenge={handleCreateChallenge}
        onJoinExisting={() => setShowGoLiveModal(false)}
      />

      <CreateReelModal
        isOpen={showCreateReel}
        onClose={() => setShowCreateReel(false)}
        onReelCreated={handleReelCreated}
      />

      <ProfileSetupDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />
    </div>
  );
}