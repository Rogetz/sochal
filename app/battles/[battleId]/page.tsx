"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";

import { useSochal } from "@/lib/sochal-store";
const SimpleAgoraStream = dynamic(
  () => import("@/components/sochal/live/SimpleAgoraStream"),
  { ssr: false }
);
import type { Battle } from "@/lib/battle-service";

export default function BattlePage() {
  const params = useParams();
  const router = useRouter();
  const { wallet, profile } = useSochal();

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

  const battleChannelName = `battle_${battle.id}`;
  const battleTitle = `${battle.creatorAName} vs ${battle.creatorBName}`;
  const isBattleCreator =
    wallet &&
    (wallet.address === battle.creatorA || wallet.address === battle.creatorB);
  const role: "host" | "audience" = isBattleCreator ? "host" : "audience";

  const hostMetadata = isBattleCreator && wallet && profile ? {
    ownerWallet: wallet.address,
    handle: profile.handle || "Creator",
    topic: (battle.topic as any) || "battle",
    title: battle.title || "Battle",
    targetSol: battle.targetSol,
  } : undefined;

  return (
    <SimpleAgoraStream
      channelName={battleChannelName}
      role={role}
      userName={profile?.displayName || wallet?.address || "Viewer"}
      creatorName={battleTitle}
      creatorHandle={battle.creatorAHandle ?? battle.creatorBHandle ?? undefined}
      liveTargetSol={battle.targetSol}
      liveTotalCollectedSol={battle.currentSol}
      challengeTitle={battle.title}
      hostMetadata={hostMetadata}
      shareUrl={`/battles/${battle.id}`}
      skipLiveMetadata={true}
      onEnd={() => router.push("/fan")}
    />
  );
}