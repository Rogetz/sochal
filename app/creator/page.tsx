"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import {
  useSochal,
  sochal,
  type Topic,
} from "@/lib/sochal-store";

import { TopicBadge } from "@/components/sochal/TopicBadge";
import { SolAmount } from "@/components/sochal/SolAmount";
import { ProfileSetupDialog } from "@/components/sochal/ProfileSetupDialog";

import { GoLiveModal } from "@/components/sochal/live/GoLiveModal";
import { CreateReelModal } from "@/components/sochal/live/CreateReelModal";
import dynamic from "next/dynamic";

const SimpleAgoraStream = dynamic(
  () => import("@/components/sochal/live/SimpleAgoraStream"),
  {
    ssr: false,
  }
);
import { addUserReel, getUserReels } from "@/lib/mock-data";

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
} from "lucide-react";

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

  const [showDashboard, setShowDashboard] = useState(true);

  const [myReels, setMyReels] = useState<any[]>([]);

  useEffect(() => {
    if (!wallet) return;

    const reels = getUserReels(wallet.address);
    setMyReels(reels);
  }, [wallet]);

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
        c.creatorId !== wallet.address &&
        c.status === "waiting" &&
        !c.participants.includes(wallet.address)
    );
  }, [wallet, challenges]);

  const handleCreateChallenge = (
    topic: Topic,
    title: string,
    description: string,
    targetMin: number
  ) => {
    if (!wallet) return;

    sochal.createChallenge({
      topic,
      title,
      description,
      creatorId: wallet.address,
      targetMin,
      endsAt: Date.now() + 1000 * 60 * 60 * 24,
    });

    setShowGoLiveModal(false);
  };

  const handleReelCreated = (reelData: any) => {
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

    setMyReels((prev) => [newReel, ...prev]);

    alert("✅ Reel created successfully!");
  };

  const handleStartAgoraStream = () => {
    if (!selectedChallenge) return;
    const channel = `battle_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    setCurrentChannel(channel);
    setShowAgoraStream(true);
  };

  const handleEndAgoraStream = () => {
    setShowAgoraStream(false);
    setCurrentChannel("");
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
        onEnd={handleEndAgoraStream}
      />
    );
  }

  if (activeBattle?.status === "active") {
    return (
      <div className="text-center py-32">
        <p className="text-white">Battle in progress...</p>
      </div>
    );
  }

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
          disabled={!selectedChallenge}
          onClick={handleStartAgoraStream}
          className={`h-28 rounded-2xl ${
            selectedChallenge
              ? "bg-gradient-primary shadow-glow"
              : "opacity-50 cursor-not-allowed"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <Radio className="h-8 w-8" />
            <span className="font-semibold">
              {selectedChallenge
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
              <h2 className="text-xl font-bold text-white">
                Your Challenges
              </h2>

              <Button
                onClick={() =>
                  setShowGoLiveModal(true)
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Challenge
              </Button>
            </div>

            {myChallenges.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-700 py-12 text-center">
                <p className="text-gray-500">No challenges yet. Create one to go live!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {myChallenges.map((challenge) => (
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
                      <h3 className="font-semibold text-white">
                        {challenge.title}
                      </h3>

                      <TopicBadge
                        topic={challenge.topic}
                        size="sm"
                      />
                    </div>

                    <p className="mt-3 text-sm text-gray-400">
                      {challenge.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-yellow-400">
                        🎯 {challenge.targetMin} SOL
                      </span>

                      <span className="text-green-400">
                        {challenge.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {availableChallenges.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-bold text-white">
                Join Existing Challenges
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {availableChallenges.map((challenge) => {
                  const slotsRemaining = 2 - challenge.participants.length;
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