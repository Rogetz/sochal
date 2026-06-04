"use client";

import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useSochal } from "@/lib/sochal-store";
import { useEffect, useState } from "react";

const SimpleAgoraStream = dynamic(
  () => import("@/components/sochal/live/SimpleAgoraStream"),
  { ssr: false }
);

export default function StreamPage() {
  const params = useParams();
  const router = useRouter();

  const { profile } = useSochal();

  const streamId = params.streamId as string;
  const [creatorInfo, setCreatorInfo] = useState<{
    displayName?: string;
    handle?: string;
    onChainAddress?: string;
    targetSol?: number;
    potSol?: number;
  } | null>(null);
  const [challengeTitle, setChallengeTitle] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreatorInfo = async () => {
      try {
        // Fetch stream metadata to get creator info
        const response = await fetch(
          `/api/live-streams?channelName=${encodeURIComponent(streamId)}`,
          { cache: "no-store" }
        );

        if (response.ok) {
          const data = await response.json();
          const stream = data.stream || data.streams?.[0];

          if (stream) {
            setCreatorInfo({
              displayName: stream.displayName,
              handle: stream.handle,
              onChainAddress: stream.onChainAddress,
              targetSol: typeof stream.targetSol === "number" ? stream.targetSol : Number(stream.targetSol ?? 0),
              potSol: typeof stream.potSol === "number" ? stream.potSol : Number(stream.potSol ?? 0),
            });

            if (typeof stream.challengeId === "string" && stream.challengeId) {
              const challengeResponse = await fetch("/api/challenges", { cache: "no-store" });

              if (challengeResponse.ok) {
                const challengeData = await challengeResponse.json();
                const challenge = Array.isArray(challengeData.challenges)
                  ? challengeData.challenges.find((entry: { id: string; title?: string }) => entry.id === stream.challengeId)
                  : null;

                setChallengeTitle(challenge?.title);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching creator info:", err);
      } finally {
        setLoading(false);
      }
    };

    if (streamId) {
      fetchCreatorInfo();
    }
  }, [streamId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="size-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Joining stream...</p>
        </div>
      </div>
    );
  }

  return (
    <SimpleAgoraStream
      channelName={streamId}
      role="audience"
      userName={profile?.displayName || "Viewer"}
      creatorName={creatorInfo?.displayName}
      creatorHandle={creatorInfo?.handle}
      liveOnChainAddress={creatorInfo?.onChainAddress}
      liveTargetSol={creatorInfo?.targetSol}
      liveTotalCollectedSol={creatorInfo?.potSol}
      challengeTitle={challengeTitle}
      onEnd={() => router.push("/")}
    />
  );
}
