"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Flame } from "lucide-react";
import type { Battle } from "@/lib/battle-service";

export function BattleBrowser() {
  const router = useRouter();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadBattles = async () => {
      try {
        const response = await fetch("/api/battles", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Failed to load battles");
        }

        const data = await response.json();

        if (active) {
          setBattles(Array.isArray(data.battles) ? data.battles : []);
          setLoading(false);
        }
      } catch {
        if (active) {
          setBattles([]);
          setLoading(false);
        }
      }
    };

    loadBattles();

    const interval = setInterval(loadBattles, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-red-500/15">
            <Flame className="size-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Active Battles</h1>
            <p className="text-sm text-gray-400">
              Watch the current matchups and jump into a battle room.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-8 text-center text-gray-400">
            Loading battles...
          </div>
        ) : battles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-950 p-8 text-center">
            <Trophy className="mx-auto mb-3 size-10 text-gray-500" />
            <p className="font-medium text-gray-300">No active battles right now</p>
            <p className="mt-1 text-sm text-gray-500">
              Check back soon when creators get matched up.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {battles.map((battle) => (
              <div
                key={battle.id}
                className="rounded-3xl border border-gray-800 bg-gradient-to-br from-gray-950 to-black p-5 transition hover:border-red-500/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge className="mb-2 bg-red-500/15 text-red-300 hover:bg-red-500/15">
                      Battle
                    </Badge>
                    <h2 className="truncate text-lg font-semibold text-white">
                      {battle.title}
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">{battle.topic}</p>
                  </div>
                  <div className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300">
                    Active
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-purple-500/10 p-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-purple-300">Creator A</p>
                    <p className="mt-1 truncate font-semibold text-white">{battle.creatorAName}</p>
                    <p className="text-xs text-gray-400">{battle.creatorAHandle}</p>
                  </div>

                  <div className="rounded-2xl bg-blue-500/10 p-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-blue-300">Creator B</p>
                    <p className="mt-1 truncate font-semibold text-white">{battle.creatorBName || "Waiting"}</p>
                    <p className="text-xs text-gray-400">{battle.creatorBHandle || "Joining soon"}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-gray-300">
                  <span className="flex items-center gap-1">
                    <Users className="size-4" />
                    {battle.viewersA + battle.viewersB} viewers
                  </span>
                  <span className="text-yellow-300">
                    {battle.currentSol.toFixed(1)} SOL raised
                  </span>
                </div>

                <Button
                  className="mt-4 w-full bg-red-600 hover:bg-red-700"
                  onClick={() => router.push(`/battles/${battle.id}`)}
                >
                  Join Battle
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}