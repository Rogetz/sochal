"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LiveStream } from "@/lib/sochal-store";
import { TopicBadge } from "@/components/sochal/TopicBadge";
import { SolAmount } from "@/components/sochal/SolAmount";
import { Button } from "@/components/ui/button";
import { Users, Flame, Radio } from "lucide-react";

export default function ExplorePage() {
  const [live, setLive] = useState<LiveStream[]>([]);

  useEffect(() => {
    let active = true;

    const loadLiveStreams = async () => {
      try {
        const response = await fetch("/api/live-streams", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load live streams");
        }

        const data = await response.json();

        if (active) {
          const streams = Array.isArray(data.streams)
            ? (data.streams as LiveStream[])
            : [];

          setLive(streams.filter((stream) => stream.isLive));
        }
      } catch {
        if (active) {
          setLive([]);
        }
      }
    };

    loadLiveStreams();

    const refreshId = setInterval(loadLiveStreams, 5000);

    return () => {
      active = false;
      clearInterval(refreshId);
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-8 md:py-12">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider text-primary/80 font-mono mb-2">Live now</div>
        <h1 className="text-3xl md:text-4xl font-bold">Explore the stage</h1>
        <p className="text-muted-foreground mt-1">All live brackets, sorted by heat.</p>
      </div>

      {live.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/40 px-6 py-20 text-center">
          <div className="mx-auto size-14 grid place-items-center rounded-2xl bg-primary/15 text-primary mb-4">
            <Radio className="size-6" />
          </div>
          <h3 className="text-xl font-bold">The stage is empty</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
            No creators are live right now. Be the first to open a bracket — your title pool starts the moment fans tip in.
          </p>
          <Link href="/creator" className="inline-block mt-5">
            <Button className="bg-gradient-primary shadow-glow">
              <Radio className="size-4" /> Open the first stage
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {live.map((r) => (
            <Link
              key={r.id}
              href={`/live/${encodeURIComponent(r.id)}`}
              className="group relative rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition shadow-elevated"
            >
              <div className="relative aspect-[4/5] bg-gradient-to-br from-[oklch(0.35_0.18_265)] via-[oklch(0.25_0.15_280)] to-[oklch(0.18_0.05_260)]">
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <TopicBadge topic={r.topic} />
                  <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase text-white">Live</span>
                </div>
                <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[10px]">
                  <Users className="size-3" /> {r.viewers.toLocaleString()}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-8 rounded-full bg-gradient-primary grid place-items-center text-xs font-bold">
                      {r.displayName[0]}
                    </div>
                    <div className="text-sm font-semibold">{r.displayName}</div>
                  </div>
                  <p className="text-xs text-foreground/90 line-clamp-2">{r.title}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Flame className="size-3" /> Pot
                    </span>
                    <span className="font-mono">
                      <SolAmount value={r.potSol} /> / <SolAmount value={r.targetSol} />
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-gradient-primary" style={{ width: `${Math.min(100, (r.potSol / r.targetSol) * 100)}%` }} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}