"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { LiveStreamView } from "@/components/sochal/live/LiveStreamView";
import { MOCK_LIVE_STREAMS } from "@/lib/mock-data";

export default function LivePage() {
  const params = useParams();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent SSR issues
  if (!mounted) {
    return null;
  }

  const streamId =
    typeof params?.streamId === "string"
      ? params.streamId
      : Array.isArray(params?.streamId)
      ? params.streamId[0]
      : "";

  const liveStream = MOCK_LIVE_STREAMS.find(
    (s) => s.id === streamId
  );

  return (
    <LiveStreamView
      streamId={streamId}
      streamTitle={liveStream?.title || "Live Battle"}
      creatorName={liveStream?.creatorName || "Creator"}
      creatorHandle={liveStream?.creatorHandle || "@creator"}
      creatorAvatar={
        liveStream?.creatorAvatar ||
        "https://randomuser.me/api/portraits/lego/1.jpg"
      }
      isCreator={false}
      onEnd={() => router.back()}
    />
  );
}