"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useSochal } from "@/lib/sochal-store";
import { BattleView } from "@/components/sochal/live/BattleView";
import type { Battle } from "@/lib/battle-service";

export default function BattlePage() {
  const params = useParams();
  const router = useRouter();
  const { wallet } = useSochal();

  const battleId = params.battleId as string;
  const [battle, setBattle] = useState<Battle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadBattle = async () => {
      try {
        const response = await fetch(`/api/battles/${encodeURIComponent(battleId)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Battle not found");
        }

        const data = await response.json();

        if (active) {
          setBattle(data.battle ?? null);
          setLoading(false);
        }
      } catch {
        if (active) {
          setBattle(null);
          setLoading(false);
        }
      }
    };

    if (battleId) {
      loadBattle();
    }

    return () => {
      active = false;
    };
  }, [battleId]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <p className="text-white">Joining battle...</p>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-white text-lg font-semibold">Battle not found</p>
          <button
            onClick={() => router.push("/fan")}
            className="mt-4 rounded-full bg-red-600 px-4 py-2 text-white"
          >
            Back to Fan
          </button>
        </div>
      </div>
    );
  }

  return (
    <BattleView
      battle={battle}
      currentCreatorWallet={wallet?.address ?? "viewer"}
      onEnd={() => router.push("/fan")}
      onSendTip={(amount, creatorWallet) => {
        setBattle((current) => {
          if (!current) return current;

          const nextBattle = {
            ...current,
            currentSol: current.currentSol + amount,
            tipsA:
              creatorWallet === current.creatorA
                ? current.tipsA + amount
                : current.tipsA,
            tipsB:
              creatorWallet === current.creatorB
                ? current.tipsB + amount
                : current.tipsB,
          };

          if (nextBattle.targetSol > 0 && nextBattle.currentSol >= nextBattle.targetSol) {
            nextBattle.status = "completed";
          }

          return nextBattle;
        });
      }}
    />
  );
}