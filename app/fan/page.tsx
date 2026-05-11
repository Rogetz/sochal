"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSochal, sochal } from "@/lib/sochal-store";
import { Button } from "@/components/ui/button";
import { ReelFeed } from "@/components/sochal/reels/ReelFeed";
import { ChallengeBrowser } from "@/components/sochal/challenges/ChallengeBrowser";
import { CreateReelModal } from "@/components/sochal/live/CreateReelModal";
import { LiveStreamView } from "@/components/sochal/live/LiveStreamView";
import { ProfileSetupDialog } from "@/components/sochal/ProfileSetupDialog";
import { MOCK_LIVE_STREAMS, getUserReels } from "@/lib/mock-data";
import { 
  Home, Compass, Users, Radio, Upload, User, 
  LogIn, Heart, Search, Sparkles, Flame, X, Edit3, Settings,
  Video
} from "lucide-react";

export default function FanPage() {
  const { wallet, profile } = useSochal();
  const [activeTab, setActiveTab] = useState<"forYou" | "following" | "live" | "challenges" | "profile">("forYou");
  const [showCreateReel, setShowCreateReel] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeLiveStream, setActiveLiveStream] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [myReels, setMyReels] = useState<any[]>([]);
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

  const trendingTopics = [
    { tag: "#Singing", posts: "128.5K", icon: "🎤" },
    { tag: "#Dancing", posts: "95.2K", icon: "💃" },
    { tag: "#Comedy", posts: "67.8K", icon: "😂" },
    { tag: "#Rap", posts: "45.3K", icon: "🎙️" },
    { tag: "#Gaming", posts: "34.1K", icon: "🎮" },
  ];

  const handleJoinLive = (streamId: string) => {
    const liveStream = MOCK_LIVE_STREAMS.find(s => s.id === streamId);
    setActiveLiveStream({
      id: liveStream?.id || streamId,
      creatorName: liveStream?.creatorName || "Live Creator",
      creatorHandle: liveStream?.creatorHandle || "@creator",
      creatorAvatar: liveStream?.creatorAvatar || "https://randomuser.me/api/portraits/lego/1.jpg",
      title: liveStream?.title || "Live Battle",
    });
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

  if (activeLiveStream) {
    return (
      <LiveStreamView
        streamId={activeLiveStream.id}
        streamTitle={activeLiveStream.title}
        creatorName={activeLiveStream.creatorName}
        creatorHandle={activeLiveStream.creatorHandle}
        creatorAvatar={activeLiveStream.creatorAvatar}
        isCreator={false}
        onEnd={() => setActiveLiveStream(null)}
      />
    );
  }

  if (!wallet) {
    return <ConnectGate />;
  }

  return (
    <div className="min-h-screen bg-black">
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
            <NavItem icon={<Upload size={22} />} label="Upload" active={false} onClick={() => setShowCreateReel(true)} />
            <NavItem icon={<User size={22} />} label="Profile" active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
          </nav>

          {wallet && profile && (
            <div className="pt-4 mt-4 border-t border-gray-800">
              <div className="flex items-center gap-3 px-3 py-2">
                <img src="https://randomuser.me/api/portraits/lego/1.jpg" alt="" className="size-10 rounded-full object-cover" />
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
            <MobileNavItem icon={<Upload size={24} />} label="Create" active={false} onClick={() => setShowCreateReel(true)} />
            <MobileNavItem icon={<User size={24} />} label="Profile" active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex-1 lg:ml-64 lg:mr-80">
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
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setShowSearch(!showSearch)} className="size-9 rounded-full bg-gray-800/50 flex items-center justify-center">
                  {showSearch ? <X className="size-5 text-gray-400" /> : <Search className="size-5 text-gray-400" />}
                </button>
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
            {activeTab === "forYou" && <ReelFeed onJoinLive={handleJoinLive} />}
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
                <div className="grid grid-cols-2 gap-3">
                  {MOCK_LIVE_STREAMS.map((stream) => (
                    <button key={stream.id} onClick={() => handleJoinLive(stream.id)} className="relative aspect-[9/16] rounded-xl overflow-hidden bg-gradient-to-b from-gray-800 to-gray-900">
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition" />
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 rounded-full px-2 py-0.5">
                        <span className="size-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-xs">LIVE</span>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-sm font-semibold">{stream.creatorName}</p>
                        <p className="text-yellow-400 text-xs mt-1">🏆 {stream.tips} SOL</p>
                      </div>
                    </button>
                  ))}
                </div>
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
                  <img src={creator.avatar} alt="" className="size-10 rounded-full object-cover" />
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

// Profile Screen Component (keep from your original)
function ProfileScreen({ myReels, profile, profileData, setProfileData, onEditProfile, onSettings, onCreateReel }: any) {
  const [activeReelTab, setActiveReelTab] = useState<"reels" | "likes">("reels");
  const totalLikes = myReels.reduce((acc: number, reel: any) => acc + (reel.likes || 0), 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-start gap-6 mb-6">
        <img src="https://randomuser.me/api/portraits/lego/1.jpg" alt="" className="size-24 rounded-full object-cover border-3 border-blue-500" />
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
            {myReels.map((reel) => (
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
  const { sochal } = require("@/lib/sochal-store");
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