"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useSochal } from "@/lib/sochal-store";

// Dynamically import AgoraLiveStream to avoid SSR issues
const AgoraLiveStream = dynamic(
  () => import("@/components/sochal/live/AgoraLiveStream").then(mod => mod.AgoraLiveStream),
  { ssr: false }
);

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