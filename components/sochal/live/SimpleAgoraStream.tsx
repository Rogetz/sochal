"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Heart,
  MessageCircle,
  Gift,
  Share2,
  Send,
  Volume2,
  VolumeX,
  FlipHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SimpleAgoraStreamProps {
  channelName: string;
  role: "host" | "audience";
  userName: string;
  onEnd: () => void;
}

export default function SimpleAgoraStream({
  channelName,
  role,
  userName,
  onEnd,
}: SimpleAgoraStreamProps) {
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  const clientRef = useRef<any>(null);
  const localTracksRef = useRef<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const [messages, setMessages] = useState<
    { user: string; text: string; isTip?: boolean }[]
  >([
    {
      user: "System",
      text: "🔥 Welcome to the live stream!",
    },
  ]);

  const [message, setMessage] = useState("");

  const [showChat, setShowChat] = useState(true);

  const [tips, setTips] = useState(0);

  const [viewers, setViewers] = useState(1);

  const [liked, setLiked] = useState(false);

  const [showGiftModal, setShowGiftModal] = useState(false);

  const giftAmounts = [0.1, 0.5, 1, 5, 10, 20];

  useEffect(() => {
    let mounted = true;

    const initAgora = async () => {
      try {
        if (typeof window === "undefined") return;

        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;

        const client = AgoraRTC.createClient({
          mode: "live",
          codec: "vp8",
        });

        clientRef.current = client;

        const response = await fetch("/api/agora/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channelName,
            uid: 0,
            role,
          }),
        });

        const data = await response.json();

        if (!data.token) {
          throw new Error("Failed to get Agora token");
        }

        const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

        await client.join(APP_ID, channelName, data.token, null);

        await client.setClientRole(
          role === "host" ? "host" : "audience"
        );

        // HOST
        if (role === "host") {
          const tracks =
            await AgoraRTC.createMicrophoneAndCameraTracks();

          localTracksRef.current = tracks;

          await client.publish(tracks);

          if (localVideoRef.current) {
            tracks[1].play(localVideoRef.current);
          }
        }

        // AUDIENCE
        client.on("user-published", async (user: any, mediaType: any) => {
          await client.subscribe(user, mediaType);

          if (mediaType === "video") {
            if (remoteVideoRef.current) {
              user.videoTrack.play(remoteVideoRef.current);
            }
          }

          if (mediaType === "audio") {
            user.audioTrack.play();
          }

          setViewers((prev) => prev + 1);
        });

        client.on("user-left", () => {
          setViewers((prev) => Math.max(prev - 1, 1));
        });

        if (mounted) {
          setLoading(false);
        }
      } catch (err: any) {
        console.error(err);

        setError(err.message || "Agora connection failed");
        setLoading(false);
      }
    };

    initAgora();

    return () => {
      mounted = false;

      const cleanup = async () => {
        try {
          localTracksRef.current.forEach((track) => {
            track.stop();
            track.close();
          });

          if (clientRef.current) {
            await clientRef.current.leave();
          }
        } catch (e) {
          console.log(e);
        }
      };

      cleanup();
    };
  }, [channelName, role]);

  const toggleMic = async () => {
    const audioTrack = localTracksRef.current[0];

    if (!audioTrack) return;

    await audioTrack.setEnabled(isMuted);

    setIsMuted(!isMuted);
  };

  const toggleVideo = async () => {
    const videoTrack = localTracksRef.current[1];

    if (!videoTrack) return;

    await videoTrack.setEnabled(isVideoOff);

    setIsVideoOff(!isVideoOff);
  };

  const sendMessage = () => {
    if (!message.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        user: userName,
        text: message,
      },
    ]);

    setMessage("");
  };

  const sendTip = (amount: number) => {
    setTips((prev) => prev + amount);

    setMessages((prev) => [
      ...prev,
      {
        user: userName,
        text: `🎁 Sent ${amount} SOL`,
        isTip: true,
      },
    ]);

    setShowGiftModal(false);
  };

  const shareStream = async () => {
    try {
      const url = `${window.location.origin}/live/${channelName}`;

      await navigator.clipboard.writeText(url);

      alert("Link copied!");
    } catch (e) {
      console.log(e);
    }
  };

  const endStream = async () => {
    try {
      localTracksRef.current.forEach((track) => {
        track.stop();
        track.close();
      });

      if (clientRef.current) {
        await clientRef.current.leave();
      }

      onEnd();
    } catch (e) {
      console.log(e);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="size-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">
            Connecting to live stream...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">{error}</p>

          <Button onClick={onEnd}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden">
      {/* VIDEO */}
      <div className="absolute inset-0">
        {role === "host" ? (
          <div
            ref={localVideoRef}
            className="w-full h-full"
          />
        ) : (
          <div
            ref={remoteVideoRef}
            className="w-full h-full"
          />
        )}
      </div>

      {/* OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />

      {/* TOP */}
      <div className="absolute top-5 left-4 z-20 flex items-center gap-3">
        <div className="size-12 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold">
          {userName.charAt(0)}
        </div>

        <div>
          <p className="text-white font-semibold">
            {userName}
          </p>

          <div className="flex items-center gap-2">
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              LIVE
            </span>

            <span className="text-white text-sm">
              {viewers} viewers
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT ACTIONS */}
      <div className="absolute right-3 bottom-28 z-20 flex flex-col gap-5 items-center">
        <button onClick={() => setLiked(!liked)}>
          <div className="size-12 rounded-full bg-black/40 flex items-center justify-center">
            <Heart
              className={`size-7 ${
                liked
                  ? "fill-red-500 text-red-500"
                  : "text-white"
              }`}
            />
          </div>
        </button>

        <button onClick={() => setShowChat(!showChat)}>
          <div className="size-12 rounded-full bg-black/40 flex items-center justify-center">
            <MessageCircle className="size-7 text-white" />
          </div>
        </button>

        <button onClick={shareStream}>
          <div className="size-12 rounded-full bg-black/40 flex items-center justify-center">
            <Share2 className="size-7 text-white" />
          </div>
        </button>

        <button onClick={() => setShowGiftModal(true)}>
          <div className="size-12 rounded-full bg-black/40 flex items-center justify-center">
            <Gift className="size-7 text-yellow-400" />
          </div>
        </button>
      </div>

      {/* HOST CONTROLS */}
      {role === "host" && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
          <button
            onClick={toggleMic}
            className="size-14 rounded-full bg-black/50 flex items-center justify-center"
          >
            {isMuted ? (
              <MicOff className="text-white" />
            ) : (
              <Mic className="text-white" />
            )}
          </button>

          <button
            onClick={toggleVideo}
            className="size-14 rounded-full bg-black/50 flex items-center justify-center"
          >
            {isVideoOff ? (
              <VideoOff className="text-white" />
            ) : (
              <Video className="text-white" />
            )}
          </button>

          <button
            onClick={endStream}
            className="size-14 rounded-full bg-red-500 flex items-center justify-center"
          >
            <PhoneOff className="text-white" />
          </button>
        </div>
      )}

      {/* CHAT */}
      {showChat && (
        <div className="absolute left-4 bottom-24 w-[320px] h-[300px] bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 z-20 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`text-sm ${
                  msg.isTip
                    ? "bg-yellow-500/20 rounded-lg p-2"
                    : ""
                }`}
              >
                <span className="text-pink-400 font-semibold">
                  {msg.user}:{" "}
                </span>

                <span className="text-white">
                  {msg.text}
                </span>
              </div>
            ))}
          </div>

          <div className="p-2 border-t border-white/10 flex gap-2">
            <Input
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Say something..."
              className="bg-black/40 border-white/10 text-white"
            />

            <Button onClick={sendMessage}>
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* GIFTS */}
      {showGiftModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-3xl p-6 w-[340px]">
            <h2 className="text-white text-xl font-bold mb-5">
              Send Gift
            </h2>

            <div className="grid grid-cols-3 gap-3">
              {giftAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => sendTip(amount)}
                  className="h-20 rounded-2xl bg-pink-500/20 text-pink-400 font-bold hover:bg-pink-500/30"
                >
                  {amount} SOL
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full mt-5"
              onClick={() => setShowGiftModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}