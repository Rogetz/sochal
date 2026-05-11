import { useState, useRef, useEffect } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Download, UserPlus, Volume2, VolumeX, Gift, Music2 } from "lucide-react";
import { MockReel } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

interface ReelItemProps {
  reel: MockReel;
  isActive: boolean;
  onJoinLive?: (streamId: string) => void;
}

export function ReelItem({ reel, isActive, onJoinLive }: ReelItemProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<{ user: string; text: string }[]>([]);
  const [showGiftTip, setShowGiftTip] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(e => console.log("Auto-play prevented:", e));
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isActive]);

  const handleLike = () => setIsLiked(!isLiked);
  const handleSave = () => setIsSaved(!isSaved);
  const handleFollow = () => setIsFollowing(!isFollowing);

  const handleShare = async () => {
    const url = `${window.location.origin}/reel/${reel.id}`;
    if (navigator.share) {
      await navigator.share({ title: reel.creatorName, text: reel.description, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied!");
    }
  };

  const handleSendTip = (amount: number) => {
    setShowGiftTip(false);
    alert(`🎁 Sent ${amount} SOL to ${reel.creatorName}!`);
  };

  const handleComment = () => {
    if (comment.trim()) {
      setComments([...comments, { user: "You", text: comment }]);
      setComment("");
    }
  };

  return (
    <div className="relative h-screen w-full snap-start bg-black">
      <video
        ref={videoRef}
        src={reel.videoUrl}
        loop
        muted={isMuted}
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

      {/* Top - Creator Info */}
      <div className="absolute top-12 left-4 right-20 z-10 flex items-center gap-3">
        <img src={reel.creatorAvatar} alt="" className="size-10 rounded-full border-2 border-white object-cover" />
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">{reel.creatorName}</p>
          <p className="text-gray-300 text-xs">{reel.creatorHandle}</p>
        </div>
        <button
          onClick={handleFollow}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
            isFollowing ? "bg-gray-700 text-white" : "bg-white text-black hover:bg-gray-200"
          }`}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      </div>

      {/* Live Badge */}
      {reel.isLive && (
        <div className="absolute top-12 left-4 z-10 flex items-center gap-2">
          <div className="flex items-center gap-1 bg-red-500 rounded-full px-2 py-1">
            <span className="size-1.5 bg-white rounded-full animate-pulse" />
            <span className="text-white text-xs font-medium">LIVE</span>
          </div>
          <div className="bg-black/50 rounded-full px-2 py-1">
            <span className="text-white text-xs">{reel.liveViewers} watching</span>
          </div>
        </div>
      )}

      {/* Bottom Info */}
      <div className="absolute bottom-28 left-4 right-20 z-10">
        <p className="text-white text-sm font-medium">{reel.description}</p>
        <p className="text-blue-400 text-xs mt-1">#{reel.topic}</p>
        
        {/* Music */}
        <div className="flex items-center gap-2 mt-2">
          <div className="size-5 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Music2 className="size-3 text-yellow-400" />
          </div>
          <span className="text-gray-300 text-xs">Original Sound - {reel.creatorName}</span>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="absolute right-3 bottom-32 z-10 flex flex-col items-center gap-5">
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className="size-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <Heart className={`size-6 ${isLiked ? "fill-red-500 text-red-500" : "text-white"}`} />
          </div>
          <span className="text-white text-xs">{reel.likes + (isLiked ? 1 : 0)}</span>
        </button>

        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <div className="size-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <MessageCircle className="size-6 text-white" />
          </div>
          <span className="text-white text-xs">{reel.comments + comments.length}</span>
        </button>

        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className="size-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <Share2 className="size-6 text-white" />
          </div>
          <span className="text-white text-xs">{reel.shares}</span>
        </button>

        <button onClick={() => setShowGiftTip(true)} className="flex flex-col items-center gap-1">
          <div className="size-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <Gift className="size-6 text-white" />
          </div>
          <span className="text-white text-xs">Tip</span>
        </button>

        <button onClick={handleSave} className="flex flex-col items-center gap-1">
          <div className="size-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <Bookmark className={`size-6 ${isSaved ? "fill-yellow-400 text-yellow-400" : "text-white"}`} />
          </div>
          <span className="text-white text-xs">Save</span>
        </button>
      </div>

      {/* Mute Button */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-32 right-3 z-10 size-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center"
      >
        {isMuted ? <VolumeX className="size-5 text-white" /> : <Volume2 className="size-5 text-white" />}
      </button>

      {/* Join Live Button */}
      {reel.isLive && onJoinLive && (
        <button
          onClick={() => onJoinLive(reel.id)}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 px-5 py-2 rounded-full bg-red-500 text-white text-sm font-medium flex items-center gap-2 animate-pulse"
        >
          <span className="size-1.5 bg-white rounded-full animate-pulse" />
          Join Live · 🏆 {reel.potSol} SOL
        </button>
      )}

      {/* Tip Modal */}
      {showGiftTip && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setShowGiftTip(false)}>
          <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-2">Send a Tip</h3>
            <p className="text-gray-400 text-sm mb-4">Support {reel.creatorName}</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[0.1, 0.5, 1, 5, 10, 25].map(amount => (
                <button
                  key={amount}
                  onClick={() => handleSendTip(amount)}
                  className="py-3 rounded-xl bg-blue-600/20 text-blue-400 font-semibold"
                >
                  {amount} SOL
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={() => setShowGiftTip(false)} className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {showComments && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={() => setShowComments(false)}>
          <div className="flex-1 overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-black/90 py-2">
              <h3 className="text-white font-bold">Comments ({reel.comments + comments.length})</h3>
              <button onClick={() => setShowComments(false)} className="text-white text-2xl">×</button>
            </div>
            <div className="space-y-3 pb-20">
              {comments.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <div className="size-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">
                    {c.user[0]}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{c.user}</p>
                    <p className="text-gray-400 text-sm">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-gray-800 flex gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-gray-800 rounded-full px-4 py-2 text-white text-sm outline-none focus:ring-1 focus:ring-blue-500"
              onKeyPress={(e) => e.key === "Enter" && handleComment()}
            />
            <button onClick={handleComment} className="text-blue-400 font-semibold">Post</button>
          </div>
        </div>
      )}
    </div>
  );
}