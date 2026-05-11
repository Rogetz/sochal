"use client";

import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useSochal } from "@/lib/sochal-store";

const SimpleAgoraStream = dynamic(
  () => import("@/components/sochal/live/SimpleAgoraStream"),
  { ssr: false }
);

export default function JoinLivePage() {
  const params = useParams();
  const router = useRouter();

  const { profile } = useSochal();

  const channelName = params.channelName as string;

  return (
    <SimpleAgoraStream
      channelName={channelName}
      role="audience"
      userName={profile?.displayName || "Viewer"}
      onEnd={() => router.push("/creator")}
    />
  );
}