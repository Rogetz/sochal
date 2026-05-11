"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import the AgoraProvider to avoid SSR issues
const AgoraProvider = dynamic(
  () => import("./AgoraProvider").then((mod) => mod.AgoraProvider),
  { ssr: false }
);

const AgoraLiveStreamInner = dynamic(
  () => import("./AgoraLiveStreamInner"),
  { ssr: false }
);

interface AgoraLiveStreamProps {
  channelName: string;
  role: "host" | "audience";
  userName: string;
  onEnd: () => void;
}

export function AgoraLiveStream({ channelName, role, userName, onEnd }: AgoraLiveStreamProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="size-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Loading live stream...</p>
        </div>
      </div>
    );
  }

  return (
    <AgoraProvider>
      <AgoraLiveStreamInner
        channelName={channelName}
        role={role}
        userName={userName}
        onEnd={onEnd}
      />
    </AgoraProvider>
  );
}