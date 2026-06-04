import { useState, useEffect, useRef } from "react";
import { ReelItem } from "./ReelItem";
import { getAllReels, MockReel } from "@/lib/mock-data";
import { Loader2 } from "lucide-react";

interface ReelFeedProps {
  onJoinLive?: (streamId: string) => void;
}

export function ReelFeed({ onJoinLive }: ReelFeedProps) {
  const [reels, setReels] = useState<MockReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadedReels = getAllReels();
    setReels(loadedReels);
    setLoading(false);
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const index = Math.round(containerRef.current.scrollTop / window.innerHeight);
    if (index !== currentIndex && index >= 0 && index < reels.length) {
      setCurrentIndex(index);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [reels.length]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="size-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center px-4">
          <div className="text-6xl mb-4">🎬</div>
          <h3 className="text-xl font-bold text-white mb-2">No reels yet</h3>
          <p className="text-gray-400 text-sm">Be the first to create a reel!</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth"
    >
      {reels.map((reel, index) => (
        <ReelItem
          key={reel.id}
          reel={reel}
          isActive={index === currentIndex}
          onJoinLive={onJoinLive}
        />
      ))}
    </div>
  );
}