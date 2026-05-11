"use client";

import { useParams } from "next/navigation";
import { LiveStreamView } from "@/components/sochal/live/LiveStreamView";
import { MOCK_LIVE_STREAMS } from "@/lib/mock-data";

export default function LivePage() {
  const params = useParams();
  const streamId = params.streamId as string;
  
  const liveStream = MOCK_LIVE_STREAMS.find(s => s.id === streamId);
  
  return (
    <LiveStreamView 
      streamId={streamId}
      streamTitle={liveStream?.title || "Live Battle"}
      creatorName={liveStream?.creatorName || "Creator"}
      creatorHandle={liveStream?.creatorHandle || "@creator"}
      creatorAvatar={liveStream?.creatorAvatar || "https://randomuser.me/api/portraits/lego/1.jpg"}
      isCreator={false}
      onEnd={() => window.history.back()}
    />
  );
}