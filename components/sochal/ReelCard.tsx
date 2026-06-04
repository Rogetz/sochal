import { useState } from "react";
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Zap, Users } from "lucide-react";
import { TopicBadge } from "./TopicBadge";
import { SolAmount } from "./SolAmount";
import { Button } from "@/components/ui/button";
import { TipMenu } from "./TipMenu";
import type { Topic } from "@/lib/sochal-store";

export interface Reel {
  id: string;
  creator: string;
  handle: string;
  topic: Topic;
  title: string;
  isLive: boolean;
  potSol: number;
  targetSol: number;
  viewers: number;
  bgGradient: string;
  avatarSeed: string;
}

export function ReelCard({ reel }: { reel: Reel }) {
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const pct = Math.min(100, (reel.potSol / reel.targetSol) * 100);

  return (
    <div className="relative w-full h-[calc(100dvh-9rem)] md:h-[80vh] rounded-3xl overflow-hidden shadow-elevated snap-start">
      {/* "Video" backdrop */}
      <div
        className={`absolute inset-0 ${reel.bgGradient}`}
        style={{
          backgroundSize: "200% 200%",
          animation: "shimmer 12s linear infinite",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />

      {/* Top row */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <TopicBadge topic={reel.topic} size="md" />
          {reel.isLive && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              <span className="size-1.5 rounded-full bg-white animate-pulse" />
              Live
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full glass px-2.5 py-1 text-[10px] text-foreground/90">
            <Users className="size-3" /> {reel.viewers.toLocaleString()}
          </span>
        </div>
        <button
          onClick={() => setMuted((m) => !m)}
          className="size-9 grid place-items-center rounded-full glass text-foreground/90 hover:text-foreground"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>

      {/* Side actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5">
        {[
          { icon: <Heart className={`size-6 ${liked ? "fill-destructive text-destructive" : ""}`} />, label: "12.4k", onClick: () => setLiked((v) => !v) },
          { icon: <MessageCircle className="size-6" />, label: "284" },
          { icon: <Share2 className="size-6" />, label: "Share" },
        ].map((a, i) => (
          <button
            key={i}
            onClick={a.onClick}
            className="flex flex-col items-center gap-1 text-foreground/95 hover:text-foreground"
          >
            <div className="size-12 grid place-items-center rounded-full glass">{a.icon}</div>
            <span className="text-[10px] font-medium">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom info + tip */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-10 rounded-full bg-gradient-primary grid place-items-center text-sm font-bold shadow-glow">
                {reel.creator[0]}
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">{reel.creator}</div>
                <div className="text-xs text-muted-foreground truncate">@{reel.handle}</div>
              </div>
            </div>
            <p className="text-sm text-foreground/95 line-clamp-2 max-w-md">{reel.title}</p>

            {/* Pot progress */}
            <div className="mt-3 max-w-md">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-muted-foreground">Live pot</span>
                <span className="font-mono">
                  <SolAmount value={reel.potSol} /> <span className="text-muted-foreground">/ </span>
                  <SolAmount value={reel.targetSol} />
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-primary shadow-glow transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          <Button
            onClick={() => setTipOpen(true)}
            className="bg-gradient-primary shadow-glow font-semibold animate-pulse-glow shrink-0"
          >
            <Zap className="size-4" /> Tip
          </Button>
        </div>
      </div>

      <TipMenu open={tipOpen} onOpenChange={setTipOpen} reel={reel} />
    </div>
  );
}
