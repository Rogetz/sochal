"use client";

import { useParams } from "next/navigation";
import { AgoraLiveStream } from "@/components/sochal/live/AgoraLiveStream";
import { useSochal } from "@/lib/sochal-store";

export default function JoinLivePage() {
  const params = useParams();
  const channelName = params.channelName as string;
  const { profile } = useSochal();

  return (
    <AgoraLiveStream
      channelName={channelName}
      role="audience"
      userName={profile?.displayName || "Viewer"}
      onEnd={() => window.history.back()}
    />
  );
}