"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSochal, sochal } from "@/lib/sochal-store";
import { Button } from "@/components/ui/button";
import { ReelFeed } from "@/components/sochal/reels/ReelFeed";
import { ChallengeBrowser } from "@/components/sochal/challenges/ChallengeBrowser";
import { BattleBrowser } from "@/components/sochal/battles/BattleBrowser";
import { CreateReelModal } from "@/components/sochal/live/CreateReelModal";
import { ProfileSetupDialog } from "@/components/sochal/ProfileSetupDialog";
import { getUserReels, type MockReel } from "@/lib/mock-data";
import type { LiveStream } from "@/lib/sochal-store";
import type { Battle } from "@/lib/battle-service";
import Image from "next/image";
import { 
  Home, Compass, Users, Radio, Upload, User, 
  Search, Sparkles, Flame, X, Edit3, Settings,
  Video, Clock3, Trophy, AlertCircle, Heart, LogIn
} from "lucide-react";

export default function FanPage() {
  const router = useRouter();
  const { wallet, profile } = useSochal();
  const [activeTab, setActiveTab] = useState<"forYou" | "following" | "live" | "battles" | "upcoming" | "challenges" | "profile">("forYou");
  const [showCreateReel, setShowCreateReel] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [liveBattles, setLiveBattles] = useState<Battle[]>([]);
  const [upcomingBattles, setUpcomingBattles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [myReels, setMyReels] = useState<MockReel[]>([]);
  const [profileData, setProfileData] = useState({
    displayName: profile?.displayName || "",
    handle: profile?.handle || "",
    bio: profile?.bio || "",
  });

  useEffect(() => {
    if (wallet && activeTab === "profile") {
      const reels = getUserReels(wallet.address);
      setMyReels(reels);
    }
  }, [wallet, activeTab]);

  useEffect(() => {
    let active = true;

    const loadForYouFeed = async () => {
      try {
        const [liveResponse, battleResponse] = await Promise.all([
          fetch("/api/live-streams", { cache: "no-store" }),
          fetch("/api/battles", { cache: "no-store" }),
        ]);

        const liveData = liveResponse.ok ? await liveResponse.json() : { streams: [] };
        const battleData = battleResponse.ok ? await battleResponse.json() : { battles: [] };

        const liveStreamsPayload = Array.isArray(liveData.streams) ? liveData.streams : [];
        const uniqueLiveStreams = dedupeLiveStreams(liveStreamsPayload);

        if (active) {
          setLiveStreams(uniqueLiveStreams);
          setLiveBattles(Array.isArray(battleData.battles) ? battleData.battles : []);
        }
      } catch {
        if (active) {
          setLiveStreams([]);
          setLiveBattles([]);
        }
      }
    };

    loadForYouFeed();

    const interval = setInterval(loadForYouFeed, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const dedupeLiveStreams = (streams: unknown[]): LiveStream[] => {
    const validStreams = Array.isArray(streams) ? streams : [];
    return Array.from(
      new Map(
        validStreams
          .filter((stream) => typeof stream === "object" && stream !== null && "id" in stream)
          .map((stream) => {
            const record = stream as LiveStream;
            return [record.id, record];
          }),
      ).values(),
    );
  };

  useEffect(() => {
    let active = true;

    const loadUpcomingBattles = async () => {
      try {
        const response = await fetch("/api/battles/upcoming", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load upcoming battles");
        }

        const payload = await response.json();

        if (active) {
          setUpcomingBattles(Array.isArray(payload.battles) ? payload.battles : []);
        }
      } catch {
        if (active) {
          setUpcomingBattles([]);
        }
      }
    };

    loadUpcomingBattles();
    const interval = setInterval(loadUpcomingBattles, 8000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const trendingTopics = [
    { tag: "#Singing", posts: "128.5K", icon: "🎤" },
    { tag: "#Dancing", posts: "95.2K", icon: "💃" },
    { tag: "#Comedy", posts: "67.8K", icon: "😂" },
    { tag: "#Rap", posts: "45.3K", icon: "🎙️" },
    { tag: "#Gaming", posts: "34.1K", icon: "🎮" },
  ];

  const handleJoinLive = (streamId: string) => {
    router.push(`/live/${encodeURIComponent(streamId)}`);
  };

  const handleJoinBattle = (battleId: string) => {
    router.push(`/battles/${encodeURIComponent(battleId)}`);
  };

  const handleJoinLiveFromBrowser = (challengeId: string, liveId: string) => {
    handleJoinLive(liveId);
  };

  const handleReelCreated = (reelData: any) => {
    if (!wallet || !profile) return;
    alert("✅ Reel created successfully!");
    if (activeTab === "profile") {
      const reels = getUserReels(wallet.address);
      setMyReels(reels);
    }
  };

  const handleManualRefresh = async () => {
    try {
      await sochal.refreshFromBackend();

      const [liveResponse, battleResponse] = await Promise.all([
        fetch("/api/live-streams", { cache: "no-store" }),
        fetch("/api/battles", { cache: "no-store" }),
      ]);

      const liveData = liveResponse.ok ? await liveResponse.json() : { streams: [] };
      const battleData = battleResponse.ok ? await battleResponse.json() : { battles: [] };

      setLiveStreams(dedupeLiveStreams(Array.isArray(liveData.streams) ? liveData.streams : []));
      setLiveBattles(Array.isArray(battleData.battles) ? battleData.battles : []);
    } catch (e) {
      console.warn("Manual refresh failed:", e);
    }
  };

  const handleUpdateProfile = () => {
    sochal.saveProfile({
      handle: profileData.handle,
      displayName: profileData.displayName,
      bio: profileData.bio,
      createdAt: profile?.createdAt,
    });
    setShowEditProfile(false);
    alert("Profile updated!");
  };

  const forYouLives = useMemo(() => {
    return Array.from(
      new Map(
        liveStreams
          .filter((stream) => stream.isLive === true && typeof stream.id === "string" && stream.id)
          .map((stream) => [stream.id, stream])
      ).values()
    ).sort((a, b) => b.startedAt - a.startedAt);
  }, [liveStreams]);

  const forYouBattles = useMemo(() => {
    return Array.from(
      new Map(
        liveBattles
          .filter((battle) => battle.status === "active")
          .map((battle) => [battle.id, battle])
      ).values()
    ).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [liveBattles]);

  const hasForYouContent = forYouLives.length > 0 || forYouBattles.length > 0;

  if (!wallet) {
    return <ConnectGate />;
  }

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      <div className="flex">
        {/* LEFT SIDEBAR */}
        <aside className="hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:bottom-0 lg:w-64 lg:bg-black lg:border-r lg:border-gray-800 lg:p-4 lg:z-40">
          <div className="flex items-center gap-2 mb-8 mt-4 px-3">
            <div className="size-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-2xl font-bold text-white">sochal</span>
          </div>

          <nav className="flex-1 space-y-1">
            <NavItem icon={<Home size={22} />} label="For You" active={activeTab === "forYou"} onClick={() => setActiveTab("forYou")} />
            <NavItem icon={<Compass size={22} />} label="Explore" active={activeTab === "challenges"} onClick={() => setActiveTab("challenges")} />
            <NavItem icon={<Users size={22} />} label="Following" active={activeTab === "following"} onClick={() => setActiveTab("following")} />
            <NavItem icon={<Radio size={22} />} label="LIVE" active={activeTab === "live"} onClick={() => setActiveTab("live")} badge="LIVE" badgeColor="red" />
            <NavItem icon={<Video size={22} />} label="Battles" active={activeTab === "battles"} onClick={() => setActiveTab("battles")} />
            <NavItem icon={<Clock3 size={22} />} label="Upcoming" active={activeTab === "upcoming"} onClick={() => setActiveTab("upcoming")} />
            <NavItem icon={<Upload size={22} />} label="Upload" active={false} onClick={() => setShowCreateReel(true)} />
            <NavItem icon={<User size={22} />} label="Profile" active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
          </nav>

          {wallet && profile && (
            <div className="pt-4 mt-4 border-t border-gray-800">
              <div className="flex items-center gap-3 px-3 py-2">
                <Image src="https://randomuser.me/api/portraits/lego/1.jpg" alt="" width={40} height={40} className="rounded-full object-cover" unoptimized />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{profile.displayName}</p>
                  <p className="text-gray-500 text-xs truncate">{profile.handle}</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* MOBILE BOTTOM NAV */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-lg border-t border-gray-800 lg:hidden">
          <div className="flex justify-around py-2">
            <MobileNavItem icon={<Home size={24} />} label="Home" active={activeTab === "forYou"} onClick={() => setActiveTab("forYou")} />
            <MobileNavItem icon={<Compass size={24} />} label="Explore" active={activeTab === "challenges"} onClick={() => setActiveTab("challenges")} />
            <MobileNavItem icon={<Radio size={24} />} label="LIVE" active={activeTab === "live"} onClick={() => setActiveTab("live")} />
            <MobileNavItem icon={<Video size={24} />} label="Battles" active={activeTab === "battles"} onClick={() => setActiveTab("battles")} />
            <MobileNavItem icon={<Clock3 size={24} />} label="Upcoming" active={activeTab === "upcoming"} onClick={() => setActiveTab("upcoming")} />
            <MobileNavItem icon={<Upload size={24} />} label="Create" active={false} onClick={() => setShowCreateReel(true)} />
            <MobileNavItem icon={<User size={24} />} label="Profile" active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex-1 lg:ml-64 lg:mr-80 px-4 py-6 pb-24">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Top Header */}
          <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-sm border-b border-gray-800">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="lg:hidden flex items-center gap-2">
                <div className="size-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <span className="text-white font-bold text-xl">S</span>
                </div>
                <span className="text-xl font-bold text-white">sochal</span>
              </div>

              <div className="hidden lg:flex items-center gap-6">
                <button onClick={() => setActiveTab("forYou")} className={`pb-2 text-base font-medium ${activeTab === "forYou" ? "text-white border-b-2 border-blue-500" : "text-gray-500 hover:text-white"}`}>For You</button>
                <button onClick={() => setActiveTab("following")} className={`pb-2 text-base font-medium ${activeTab === "following" ? "text-white border-b-2 border-blue-500" : "text-gray-500 hover:text-white"}`}>Following</button>
                <button onClick={() => setActiveTab("live")} className={`pb-2 text-base font-medium ${activeTab === "live" ? "text-white border-b-2 border-blue-500" : "text-gray-500 hover:text-white"}`}>LIVE</button>
                <button onClick={() => setActiveTab("battles")} className={`pb-2 text-base font-medium ${activeTab === "battles" ? "text-white border-b-2 border-blue-500" : "text-gray-500 hover:text-white"}`}>Battles</button>
                <button onClick={() => setActiveTab("upcoming")} className={`pb-2 text-base font-medium ${activeTab === "upcoming" ? "text-white border-b-2 border-blue-500" : "text-gray-500 hover:text-white"}`}>Upcoming</button>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setShowSearch(!showSearch)} className="size-9 rounded-full bg-gray-800/50 flex items-center justify-center">
                  {showSearch ? <X className="size-5 text-gray-400" /> : <Search className="size-5 text-gray-400" />}
                </button>
                <Button variant="ghost" onClick={handleManualRefresh} className="hidden md:inline-flex">Refresh</Button>
                <div onClick={() => setActiveTab("profile")} className="size-9 rounded-full bg-gradient-primary flex items-center justify-center cursor-pointer">
                  <User className="size-5 text-white" />
                </div>
              </div>
            </div>

            {showSearch && (
              <div className="px-4 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search for creators, reels, challenges..." className="w-full bg-gray-900 rounded-full py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            )}
          </div>

          {/* Feed Content */}
          <div>
            {activeTab === "forYou" && (
              <div className="space-y-6 p-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">For You</p>
                    <h2 className="text-2xl font-bold text-white">Live now on Sochal</h2>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
                    <Clock3 className="size-3" />
                    Refreshes automatically
                  </div>
                </div>

                {hasForYouContent ? (
                  <div className="space-y-6">
                    {forYouLives.length > 0 && (
                      <section className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Radio className="size-4 text-red-400" />
                          <h3 className="text-lg font-semibold text-white">Ongoing Lives</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {forYouLives.map((stream) => (
                            <button
                              key={stream.id}
                              onClick={() => handleJoinLive(stream.id)}
                              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4 text-left transition hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-[0_20px_60px_rgba(34,211,238,0.15)]"
                            >
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_40%)] opacity-80" />
                              <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="size-12 rounded-2xl bg-white/10 p-0.5 ring-1 ring-white/10">
                                    <img
                                      src="https://randomuser.me/api/portraits/lego/1.jpg"
                                      alt=""
                                      className="size-full rounded-[14px] object-cover"
                                    />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-white">{stream.displayName}</p>
                                    <p className="text-xs text-gray-400">@{stream.handle}</p>
                                  </div>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-300">
                                  <span className="size-1.5 rounded-full bg-red-400 animate-pulse" />
                                  LIVE
                                </span>
                              </div>

                              <div className="relative mt-4 space-y-2">
                                <p className="text-base font-semibold text-white">{stream.title}</p>
                                <p className="text-sm text-gray-300 line-clamp-2">{stream.challengeId ? "Creator challenge stream" : "Open live session"}</p>
                                <div className="flex items-center justify-between text-xs text-gray-400">
                                  <span>{stream.topic}</span>
                                  <span className="text-cyan-300">🏆 {stream.potSol.toFixed(1)} SOL</span>
                                </div>
                              </div>

                              <div className="relative mt-4 flex items-center justify-between">
                                <span className="text-xs text-gray-500">Tap to join the live room</span>
                                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white transition group-hover:bg-cyan-400 group-hover:text-black">Join</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </section>
                    )}

                    {forYouBattles.length > 0 && (
                      <section className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Trophy className="size-4 text-yellow-400" />
                          <h3 className="text-lg font-semibold text-white">Ongoing Battles</h3>
                        </div>
                        <div className="grid gap-4">
                          {forYouBattles.map((battle) => (
                            <button
                              key={battle.id}
                              onClick={() => handleJoinBattle(battle.id)}
                              className="group overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-4 text-left transition hover:-translate-y-1 hover:border-yellow-400/40 hover:shadow-[0_20px_60px_rgba(234,179,8,0.15)]"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex -space-x-3">
                                    <Image src={battle.creatorAAvatar || "https://randomuser.me/api/portraits/lego/1.jpg"} alt="" width={48} height={48} className="rounded-full border-2 border-black object-cover" unoptimized />
                                    {battle.creatorBAvatar ? (
                                      <Image src={battle.creatorBAvatar} alt="" width={48} height={48} className="rounded-full border-2 border-black object-cover" unoptimized />
                                    ) : (
                                      <div className="size-12 rounded-full border-2 border-black bg-gray-800" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-white">{battle.creatorAName} vs {battle.creatorBName || "Waiting for opponent"}</p>
                                    <p className="text-xs text-gray-400">{battle.topic}</p>
                                  </div>
                                </div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-1 text-[11px] font-semibold text-yellow-300">
                                  <span className="size-1.5 rounded-full bg-yellow-400 animate-pulse" />
                                  BATTLE
                                </span>
                              </div>

                              <div className="mt-4 flex items-center justify-between text-sm">
                                <div>
                                  <p className="text-gray-300">Prize pool</p>
                                  <p className="font-semibold text-white">🏆 {battle.targetSol.toFixed(1)} SOL</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-gray-300">Status</p>
                                  <p className="font-semibold text-yellow-300">Live battle</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                ) : (
                  <div className="rounded-[2rem] border border-dashed border-white/10 bg-gradient-to-br from-zinc-950 to-black p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                    <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-400/20">
                      <AlertCircle className="size-8 text-amber-300" />
                    </div>
                    <p className="mt-4 text-xl font-semibold text-white">Nothing is live yet</p>
                    <p className="mt-2 text-sm text-gray-400">
                      Creators are quiet for now. Check back soon when the next live or battle starts.
                    </p>
                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-4 py-2 text-sm text-amber-200 ring-1 ring-amber-400/20">
                      <span>Stay tuned</span>
                      <span className="opacity-70">and grab the next moment live.</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === "following" && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Users className="size-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">Follow creators to see their reels here</p>
                </div>
              </div>
            )}
            {activeTab === "live" && (
              <div className="p-4">
                <h2 className="text-white text-lg font-semibold mb-4">Live Now</h2>
                {liveStreams.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-700 p-8 text-center">
                    <Radio className="size-10 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-300 font-medium">No creators are live right now</p>
                    <p className="text-gray-500 text-sm mt-1">Check back in a moment for the next live stream.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {liveStreams.map((stream) => (
                    <button key={stream.id} onClick={() => handleJoinLive(stream.id)} className="relative aspect-[9/16] rounded-xl overflow-hidden bg-gradient-to-b from-gray-800 to-gray-900">
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition" />
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 rounded-full px-2 py-0.5">
                        <span className="size-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-xs">LIVE</span>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-sm font-semibold">{stream.displayName}</p>
                        <p className="text-gray-300 text-xs mt-0.5">{stream.title}</p>
                        <p className="text-yellow-400 text-xs mt-1">🏆 {stream.potSol.toFixed(1)} SOL</p>
                      </div>
                    </button>
                  ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === "battles" && <BattleBrowser />}
            {activeTab === "upcoming" && (
              <div className="p-4 space-y-4">
                <h2 className="text-white text-lg font-semibold">Upcoming Challenges</h2>

                {upcomingBattles.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-700 p-8 text-center">
                    <Clock3 className="size-10 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-300 font-medium">No upcoming battle pairings yet</p>
                    <p className="text-gray-500 text-sm mt-1">Once creators hit their targets and get matched, they will appear here.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {upcomingBattles.map((battle) => (
                      <button
                        key={battle.id}
                        onClick={() => handleJoinBattle(battle.id)}
                        className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-black p-4 text-left hover:border-yellow-400/40"
                      >
                        <p className="text-xs uppercase tracking-[0.22em] text-yellow-300">Scheduled Battle</p>
                        <p className="mt-2 text-white font-semibold">{battle.challengeTitle}</p>
                        <p className="text-xs text-gray-400 mt-1">Topic: {battle.topic}</p>

                        <div className="mt-3 flex items-center gap-3">
                          <Image src={battle.creatorA.avatar} alt="" width={40} height={40} className="rounded-full object-cover" unoptimized />
                          <p className="text-sm text-white">{battle.creatorA.displayName}</p>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <Image src={battle.creatorB.avatar} alt="" width={40} height={40} className="rounded-full object-cover" unoptimized />
                          <p className="text-sm text-white">{battle.creatorB.displayName}</p>
                        </div>

                        <p className="mt-4 text-xs text-cyan-300">
                          Local time: {new Date(battle.scheduledAt).toLocaleString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === "challenges" && <ChallengeBrowser onJoinLive={handleJoinLiveFromBrowser} />}
            {activeTab === "profile" && (
              <ProfileScreen 
                myReels={myReels}
                profile={profile}
                profileData={profileData}
                setProfileData={setProfileData}
                onEditProfile={() => setShowEditProfile(true)}
                onSettings={() => setShowSettings(true)}
                onCreateReel={() => setShowCreateReel(true)}
              />
            )}
            </div>
          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="hidden lg:block lg:fixed lg:right-0 lg:top-0 lg:bottom-0 lg:w-80 lg:bg-black lg:border-l lg:border-gray-800 lg:p-6 lg:z-40 overflow-y-auto">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="size-4 text-orange-500" />
              <h3 className="text-white font-semibold">Trending Topics</h3>
            </div>
            <div className="space-y-2">
              {trendingTopics.map((topic) => (
                <div key={topic.tag} onClick={() => setActiveTab("challenges")} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-900 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{topic.icon}</span>
                    <span className="text-white text-sm font-medium">{topic.tag}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{topic.posts} posts</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-yellow-500" />
              <h3 className="text-white font-semibold">Suggested Creators</h3>
            </div>
            <div className="space-y-3">
              {[
                { name: "Sarah Soul", handle: "@sarahsoul", avatar: "https://randomuser.me/api/portraits/women/1.jpg", followers: "132K" },
                { name: "B-Boy Jay", handle: "@bboyjay", avatar: "https://randomuser.me/api/portraits/men/2.jpg", followers: "95K" },
              ].map((creator) => (
                <div key={creator.handle} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-900">
                  <Image src={creator.avatar} alt="" width={40} height={40} className="rounded-full object-cover" unoptimized />
                  <div className="flex-1">
                    <p className="text-white text-sm font-semibold">{creator.name}</p>
                    <p className="text-gray-500 text-xs">{creator.handle}</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-blue-500 text-blue-400 text-xs h-8">Follow</Button>
                </div>
              ))}
            </div>
          </div>

          <div className="text-gray-600 text-xs pt-4 border-t border-gray-800">
            <p>© 2026 Sochal. All rights reserved.</p>
          </div>
        </aside>
      </div>

      <CreateReelModal isOpen={showCreateReel} onClose={() => setShowCreateReel(false)} onReelCreated={handleReelCreated} />
      <EditProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} profileData={profileData} setProfileData={setProfileData} onSave={handleUpdateProfile} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

// Profile Screen Component
function ProfileScreen({ myReels, profile, profileData, setProfileData, onEditProfile, onSettings, onCreateReel }: any) {
  const [activeReelTab, setActiveReelTab] = useState<"reels" | "likes">("reels");
  const totalLikes = myReels.reduce((acc: number, reel: MockReel) => acc + (reel.likes || 0), 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-start gap-6 mb-6">
        <Image src="https://randomuser.me/api/portraits/lego/1.jpg" alt="" width={96} height={96} className="rounded-full object-cover border-3 border-blue-500" unoptimized />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-white">{profile?.displayName}</h2>
            <button onClick={onEditProfile} className="p-1 rounded-full bg-gray-800 hover:bg-gray-700"><Edit3 className="size-3 text-gray-400" /></button>
          </div>
          <p className="text-gray-400 text-sm mb-2">{profile?.handle}</p>
          <p className="text-gray-500 text-sm">{profile?.bio || "No bio yet"}</p>
          <div className="flex gap-4 mt-3">
            <div><span className="text-white font-semibold">{myReels.length}</span><span className="text-gray-500 text-sm ml-1">reels</span></div>
            <div><span className="text-white font-semibold">{totalLikes}</span><span className="text-gray-500 text-sm ml-1">likes</span></div>
          </div>
        </div>
        <button onClick={onSettings} className="p-2 rounded-full bg-gray-800 hover:bg-gray-700"><Settings className="size-5 text-gray-400" /></button>
      </div>

      <div className="flex gap-2 mb-6">
        <Button onClick={onEditProfile} variant="outline" className="flex-1 border-gray-700 text-white">Edit Profile</Button>
        <Button onClick={onCreateReel} className="flex-1 bg-gradient-primary">Create Reel</Button>
      </div>

      <div className="flex border-b border-gray-800 mb-4">
        <button onClick={() => setActiveReelTab("reels")} className={`flex-1 py-2 text-center font-medium ${activeReelTab === "reels" ? "text-white border-b-2 border-blue-500" : "text-gray-500"}`}>Reels</button>
        <button onClick={() => setActiveReelTab("likes")} className={`flex-1 py-2 text-center font-medium ${activeReelTab === "likes" ? "text-white border-b-2 border-blue-500" : "text-gray-500"}`}>Liked</button>
      </div>

      {activeReelTab === "reels" && (
        myReels.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-700 rounded-2xl">
            <Video className="size-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No reels yet</p>
            <Button onClick={onCreateReel} className="mt-3 bg-blue-600">Create Your First Reel</Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {myReels.map((reel: MockReel) => (
              <div key={reel.id} className="aspect-[9/16] bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer">
                <video src={reel.videoUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <Heart className="size-5 text-white fill-red-500" />
                  <span className="text-white text-sm">{reel.likes || 0}</span>
                </div>
                <div className="absolute bottom-1 left-1 bg-black/50 rounded px-1 text-[10px] text-white">{reel.topic}</div>
              </div>
            ))}
          </div>
        )
      )}

      {activeReelTab === "likes" && (
        <div className="text-center py-12">
          <Heart className="size-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">Reels you like will appear here</p>
        </div>
      )}
    </div>
  );
}

// Edit Profile Modal
function EditProfileModal({ isOpen, onClose, profileData, setProfileData, onSave }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-white text-xl font-bold mb-4">Edit Profile</h2>
        <div className="space-y-4">
          <div><label className="text-gray-400 text-sm">Display Name</label><input type="text" value={profileData.displayName} onChange={(e) => setProfileData({...profileData, displayName: e.target.value})} className="w-full bg-gray-800 rounded-lg px-3 py-2 text-white" /></div>
          <div><label className="text-gray-400 text-sm">Handle</label><input type="text" value={profileData.handle} onChange={(e) => setProfileData({...profileData, handle: e.target.value})} className="w-full bg-gray-800 rounded-lg px-3 py-2 text-white" /></div>
          <div><label className="text-gray-400 text-sm">Bio</label><textarea value={profileData.bio} onChange={(e) => setProfileData({...profileData, bio: e.target.value})} rows={3} className="w-full bg-gray-800 rounded-lg px-3 py-2 text-white" /></div>
        </div>
        <div className="flex gap-3 mt-6"><Button onClick={onSave} className="flex-1 bg-blue-600">Save</Button><Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button></div>
      </div>
    </div>
  );
}

// Settings Modal
function SettingsModal({ isOpen, onClose }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-white text-xl font-bold mb-4">Settings</h2>
        <div className="space-y-2">
          <button className="w-full text-left px-3 py-2 rounded-lg text-white hover:bg-gray-800">Privacy & Security</button>
          <button className="w-full text-left px-3 py-2 rounded-lg text-white hover:bg-gray-800">Notifications</button>
          <button className="w-full text-left px-3 py-2 rounded-lg text-white hover:bg-gray-800">Wallet Settings</button>
          <button className="w-full text-left px-3 py-2 rounded-lg text-red-400 hover:bg-gray-800" onClick={() => { sochal.disconnect(); window.location.href = "/"; }}>Log Out</button>
        </div>
        <Button onClick={onClose} variant="outline" className="w-full mt-4">Close</Button>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge, badgeColor }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl ${active ? "bg-blue-500/10 text-blue-400" : "text-gray-500 hover:text-white hover:bg-gray-900"}`}>
      {icon}<span className="font-medium">{label}</span>
      {badge && <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full bg-${badgeColor}-500/20 text-${badgeColor}-400`}>{badge}</span>}
    </button>
  );
}

function MobileNavItem({ icon, label, active, onClick }: any) {
  return <button onClick={onClick} className={`flex flex-col items-center py-1 ${active ? "text-blue-400" : "text-gray-500"}`}>{icon}<span className="text-xs mt-1">{label}</span></button>;
}

function ConnectGate() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center"><div className="text-7xl mb-4">🎤</div><h2 className="text-2xl font-bold text-white mb-2">Sochal</h2><p className="text-gray-400 mb-6">Connect your wallet to watch and create reels</p><Link href="/"><Button className="bg-gradient-primary shadow-glow"><LogIn className="size-4 mr-2" /> Connect Wallet</Button></Link></div>
    </div>
  );
}