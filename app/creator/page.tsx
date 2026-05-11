"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TOPICS, useSochal, sochal, type Topic } from "@/lib/sochal-store";
import { TopicBadge } from "@/components/sochal/TopicBadge";
import { SolAmount } from "@/components/sochal/SolAmount";
import { ProfileSetupDialog } from "@/components/sochal/ProfileSetupDialog";
import { GoLiveModal } from "@/components/sochal/live/GoLiveModal";
import { CreateReelModal } from "@/components/sochal/live/CreateReelModal";
import { LiveStreamView } from "@/components/sochal/live/LiveStreamView";
import { BattleView } from "@/components/sochal/live/BattleView";
import { addUserReel, getUserReels } from "@/lib/mock-data";
import { 
  Radio, Trophy, Coins, TrendingUp, Wifi, Camera, Mic, 
  UserCircle2, StopCircle, Users, Target, Plus, Video, 
  Sparkles, ChevronDown, ChevronUp, UsersRound, Clock
} from "lucide-react";

export default function CreatorStudio() {
  const { wallet, profile, streams, challenges, selectedChallenge, activeBattle } = useSochal();
  const router = useRouter();
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const [showCreateReel, setShowCreateReel] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(true);
  const [myReels, setMyReels] = useState<any[]>([]);

  const myStreams = useMemo(
    () => (wallet ? streams.filter((s) => s.ownerWallet === wallet.address) : []),
    [streams, wallet],
  );
  const liveNow = myStreams.find((s) => s.isLive);
  const lifetime = myStreams.reduce((acc, s) => acc + s.potSol, 0);
  const lastEarned = myStreams[0]?.potSol ?? 0;
  const wins = 0;

  if (wallet && myReels.length === 0) {
    const reels = getUserReels(wallet.address);
    if (reels.length !== myReels.length) setMyReels(reels);
  }

  const myChallenges = useMemo(
    () => challenges.filter((c) => c.creatorId === wallet?.address),
    [challenges, wallet]
  );

  const availableChallenges = useMemo(
    () => challenges.filter((c) => 
      c.creatorId !== wallet?.address && 
      c.status === "waiting" &&
      !c.participants.includes(wallet?.address || "")
    ),
    [challenges, wallet]
  );

  const handleCreateChallenge = (topic: Topic, title: string, description: string, targetMin: number) => {
    sochal.createChallenge({
      topic,
      title,
      description,
      creatorId: wallet!.address,
      targetMin,
    });
  };

  const handleReelCreated = (reelData: any) => {
    if (!wallet || !profile) return;
    const newReel = addUserReel({
      creatorId: wallet.address,
      creatorName: profile.displayName,
      creatorHandle: profile.handle,
      creatorAvatar: "https://randomuser.me/api/portraits/lego/1.jpg",
      videoUrl: URL.createObjectURL(reelData.videoFile),
      thumbnailUrl: reelData.thumbnail,
      description: reelData.description,
      topic: reelData.topic,
      isLive: false,
    });
    setMyReels(prev => [newReel, ...prev]);
    alert("✅ Reel created successfully!");
  };

  const handleStartLiveStream = () => {
    if (selectedChallenge) {
      setCurrentStreamId(`stream_${Date.now()}`);
      setIsLiveStreaming(true);
      sochal.startStream({
        topic: selectedChallenge.topic,
        title: selectedChallenge.title,
        targetSol: selectedChallenge.targetMin,
      });
    }
  };

  const handleSendBattleTip = (amount: number, targetCreator: string) => {
    if (activeBattle) {
      sochal.sendBattleTip(activeBattle.id, amount, targetCreator);
    }
  };

  const handleEndBattle = () => {
    if (activeBattle) {
      sochal.endBattle(activeBattle.id);
      setIsLiveStreaming(false);
      setCurrentStreamId(null);
    }
  };

  if (!wallet) {
    return (
      <div className="mx-auto max-w-md text-center py-32 px-4">
        <h2 className="text-2xl font-bold">Connect a wallet to start your stream</h2>
        <Link href="/" className="inline-block mt-6">
          <Button className="bg-gradient-primary shadow-glow">Back to home</Button>
        </Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-md text-center py-32 px-4">
        <div className="mx-auto size-14 grid place-items-center rounded-2xl bg-primary/15 text-primary mb-4">
          <UserCircle2 className="size-6" />
        </div>
        <h2 className="text-2xl font-bold">Create your creator profile</h2>
        <p className="text-muted-foreground mt-2">Pick a unique handle so fans can find and tip you.</p>
        <Button onClick={() => setProfileOpen(true)} className="mt-6 bg-gradient-primary shadow-glow">
          Set up profile
        </Button>
        <ProfileSetupDialog open={profileOpen} onOpenChange={setProfileOpen} />
      </div>
    );
  }

  const stats = [
    { icon: Coins, label: "Lifetime earned", value: lifetime, accent: "text-gradient" },
    { icon: TrendingUp, label: "Last live earned", value: lastEarned },
    { icon: Trophy, label: "Bracket wins", value: wins, isCount: true },
  ];

  // If in an active battle, show battle view
  if (activeBattle && activeBattle.status === "active") {
    return (
      <BattleView
        battle={activeBattle}
        currentCreatorWallet={wallet.address}
        onEnd={handleEndBattle}
        onSendTip={handleSendBattleTip}
      />
    );
  }

  // If currently live streaming, show the live stream view
  if (isLiveStreaming && currentStreamId) {
    return (
      <LiveStreamView
        streamId={currentStreamId}
        streamTitle={selectedChallenge?.title || "Live Battle"}
        creatorName={profile.displayName}
        creatorHandle={profile.handle}
        creatorAvatar="https://randomuser.me/api/portraits/lego/1.jpg"
        isCreator={true}
        onEnd={() => {
          setIsLiveStreaming(false);
          setCurrentStreamId(null);
          sochal.endStream(currentStreamId);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8 md:py-12">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-wider text-primary/80 font-mono mb-2">
            Studio · @{profile.handle}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Ready to take the stage, {profile.displayName}?</h1>
          <p className="text-muted-foreground mt-1">Create reels, start challenges, or go live!</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowDashboard(!showDashboard)}
          className="border-gray-700 text-gray-400 hover:text-white"
        >
          {showDashboard ? <ChevronUp className="size-4 mr-1" /> : <ChevronDown className="size-4 mr-1" />}
          {showDashboard ? "Hide Dashboard" : "Show Dashboard"}
        </Button>
      </div>

      {selectedChallenge && (
        <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="size-5 text-green-400" />
            <div>
              <p className="text-xs text-green-400">ACTIVE CHALLENGE</p>
              <p className="font-semibold text-white">{selectedChallenge.title}</p>
              <p className="text-xs text-gray-400">#{selectedChallenge.topic} · {selectedChallenge.targetMin} SOL target</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sochal.setSelectedChallenge(null)}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            Clear
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Button
          onClick={() => setShowCreateReel(true)}
          className="h-28 flex flex-col gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl"
        >
          <Video className="size-8" />
          <span className="font-semibold">Create Reel</span>
          <span className="text-xs opacity-80">Record & post video</span>
        </Button>
        <Button
          onClick={handleStartLiveStream}
          disabled={!selectedChallenge}
          className={`h-28 flex flex-col gap-2 rounded-2xl ${
            selectedChallenge
              ? "bg-gradient-primary shadow-glow animate-pulse-glow"
              : "bg-gray-700 cursor-not-allowed opacity-50"
          } text-white`}
        >
          <Radio className="size-8" />
          <span className="font-semibold">{selectedChallenge ? "Go Live Now" : "Select Challenge First"}</span>
          <span className="text-xs opacity-80">Start streaming live</span>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <s.icon className="size-4 text-primary" />
                </div>
                <div className={`mt-2 text-3xl font-bold ${s.accent ?? ""}`}>
                  {s.isCount ? s.value : <SolAmount value={s.value} />}
                </div>
              </div>
            ))}
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Plus className="size-4 text-primary" /> Your Challenges
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGoLiveModal(true)}
                className="border-blue-500/50 text-blue-400 text-xs"
              >
                Create New
              </Button>
            </div>
            {myChallenges.length === 0 ? (
              <div className="text-center py-8 rounded-2xl border border-dashed border-gray-700">
                <p className="text-gray-500 text-sm">No challenges yet. Click "Create New" to start one.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {myChallenges.map((challenge) => (
                  <div
                    key={challenge.id}
                    onClick={() => sochal.setSelectedChallenge(challenge)}
                    className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                      selectedChallenge?.id === challenge.id
                        ? "border-green-500 bg-green-500/10"
                        : "border-gray-700 bg-gray-900 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-white">{challenge.title}</h4>
                        <TopicBadge topic={challenge.topic} size="sm" />
                      </div>
                      <span className="text-xs text-gray-500">{challenge.participants.length} joined</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-2 line-clamp-2">{challenge.description}</p>
                    <div className="flex justify-between items-center mt-3 text-xs">
                      <span className="text-yellow-400">🎯 {challenge.targetMin} SOL target</span>
                      <span className={`text-xs ${challenge.status === "waiting" ? "text-yellow-500" : "text-green-500"}`}>
                        {challenge.status === "waiting" ? "Waiting for opponents..." : "Active"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {availableChallenges.length > 0 && (
            <div className="mb-8">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <UsersRound className="size-4 text-primary" /> Join Existing Challenges
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {availableChallenges.map((challenge) => {
                  const slotsRemaining = 2 - challenge.participants.length;
                  return (
                    <div
                      key={challenge.id}
                      onClick={() => sochal.joinChallenge(challenge.id)}
                      className="group rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-950 p-4 cursor-pointer hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300"
                    >
                      <div className="flex items-start gap-4">
                        <div className="size-16 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <span className="text-3xl">
                            {challenge.topic === "Singing" && "🎤"}
                            {challenge.topic === "Dancing" && "💃"}
                            {challenge.topic === "Comedy" && "😂"}
                            {challenge.topic === "Rap" && "🎙️"}
                            {challenge.topic === "Gaming" && "🎮"}
                            {!["Singing","Dancing","Comedy","Rap","Gaming"].includes(challenge.topic) && "🏆"}
                          </span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-white group-hover:text-green-400 transition">
                                {challenge.title}
                              </h4>
                              <TopicBadge topic={challenge.topic} size="sm" />
                            </div>
                            <span className="text-xs text-yellow-400">🎯 {challenge.targetMin} SOL</span>
                          </div>
                          <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                            {challenge.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <div className="flex items-center gap-1 text-gray-500">
                              <UsersRound className="size-3" />
                              <span>{slotsRemaining} slot{slotsRemaining !== 1 ? 's' : ''} remaining</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-500">
                              <Clock className="size-3" />
                              <span>Open</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        size="sm" 
                        className="mt-4 w-full bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/30 group-hover:bg-green-600/40 transition-all"
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
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Video className="size-4 text-primary" /> Your Recent Reels
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {myReels.slice(0, 3).map((reel) => (
                  <div key={reel.id} className="aspect-[9/16] bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer">
                    <video src={reel.videoUrl} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="text-white text-xs">▶️</span>
                    </div>
                    <div className="absolute bottom-1 left-1 bg-black/50 rounded px-1 text-[10px] text-white">
                      {reel.topic}
                    </div>
                  </div>
                ))}
              </div>
              {myReels.length > 3 && (
                <p className="text-center text-gray-500 text-xs mt-2">
                  +{myReels.length - 3} more reels in your profile
                </p>
              )}
            </div>
          )}
        </>
      )}

      <GoLiveModal
        isOpen={showGoLiveModal}
        onClose={() => setShowGoLiveModal(false)}
        onCreateChallenge={handleCreateChallenge}
        onJoinExisting={() => {
          setShowGoLiveModal(false);
          setTimeout(() => {
            const element = document.querySelector('[class*="Join Existing Challenges"]')?.parentElement;
            if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        }}
      />

      <CreateReelModal
        isOpen={showCreateReel}
        onClose={() => setShowCreateReel(false)}
        onReelCreated={handleReelCreated}
      />

      <ProfileSetupDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}