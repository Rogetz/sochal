"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {toast} from "sonner";
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
import { streamingService } from "@/lib/streaming-service";
import { closeLiveOnChain, tipLiveOnChain } from "@/lib/solana-live";
import { sochal, type Topic } from "@/lib/sochal-store";
import type { Battle } from "@/lib/battle-service";
import { TipCelebration } from "@/components/sochal/live/TipCelebration";

export interface SimpleAgoraStreamProps {
  channelName: string;
  role: "host" | "audience";
  userName: string;
  creatorName?: string; // Name of the stream creator (for audience to see)
  creatorHandle?: string; // Handle of the stream creator (for audience to see)
  liveOnChainAddress?: string;
  liveTargetSol?: number;
  liveTotalCollectedSol?: number;
  challengeTitle?: string;
  hostMetadata?: {
    ownerWallet: string;
    handle: string;
    onChainAddress?: string;
    challengeId?: string;
    topic: Topic;
    title: string;
    targetSol: number;
  };
  onEnd: () => void;
}

// Generate a non-zero positive int UID for Agora RTC.
const generateAgoraUid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    // Limit to signed 31-bit positive range and avoid zero.
    const uid = (arr[0] & 0x7fffffff) || 1;
    return uid;
  }

  return Math.floor(Math.random() * 0x7fffffff) + 1;
};

type AgoraTokenResponse = {
  token?: string;
  uid?: number | null;
  error?: string;
};

const requestStreamingPermissions = async (role: "host" | "audience") => {
  if (role !== "host") return true;

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Your browser does not support camera and microphone permissions.");
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    toast.error("Please allow camera and microphone access to start streaming.");
    throw new Error("Camera and microphone permissions are required to go live.");
  }
};

export default function SimpleAgoraStream({
  channelName,
  role,
  userName,
  creatorName,
  creatorHandle,
  liveOnChainAddress: liveOnChainAddressProp,
  liveTargetSol: liveTargetSolProp,
  liveTotalCollectedSol,
  challengeTitle,
  hostMetadata,
  onEnd,
}: SimpleAgoraStreamProps) {
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  const clientRef = useRef<any>(null);
  const localTracksRef = useRef<any[]>([]);
  const remoteUsersRef = useRef<Map<string | number, any>>(new Map());
  const uidRef = useRef<number>(generateAgoraUid());
  const connectionAttemptsRef = useRef<number>(0);
  const maxReconnectAttemptsRef = useRef<number>(5);
  const viewerJoinedRef = useRef(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const battleHandledRef = useRef<string | null>(null);
  const onEndRef = useRef(onEnd);
  const closeInProgressRef = useRef<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected">("connecting");

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const [messages, setMessages] = useState<
    { user: string; userName?: string; text: string; isTip?: boolean; id?: string }[]
  >([
    {
      user: "System",
      text: "🔥 Welcome to the live stream!",
    },
  ]);

  const [message, setMessage] = useState("");

  const [showChat, setShowChat] = useState(true);

  const [tips, setTips] = useState(liveTotalCollectedSol ?? 0);
  const [liveTargetAmountSol, setLiveTargetAmountSol] = useState(
    liveTargetSolProp ?? hostMetadata?.targetSol ?? 0
  );
  const [liveOnChainAddress, setLiveOnChainAddress] = useState(
    liveOnChainAddressProp
  );
  const liveOnChainAddressRef = useRef<string | undefined>(liveOnChainAddressProp);
  const [sendingAmount, setSendingAmount] = useState<number | null>(null);

  const [viewers, setViewers] = useState(role === "host" ? 0 : 1);

  const [liked, setLiked] = useState(false);

  const [showGiftModal, setShowGiftModal] = useState(false);
  const [tipCelebration, setTipCelebration] = useState<{ amountSol: number; creatorLabel: string } | null>(null);
  const [achievementCelebration, setAchievementCelebration] = useState(false);
  const [targetCountdownEndsAt, setTargetCountdownEndsAt] = useState<number | null>(null);
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const [topTipper, setTopTipper] = useState<{ address: string; amountSol: number } | null>(null);

  const [messageRefreshKey, setMessageRefreshKey] = useState(0);

  // Track when the host ends the stream so we can stop polling and show the end state.
  const [streamEnded, setStreamEnded] = useState(false);
  const targetCelebrationShownRef = useRef(false);
  const pendingBattleRef = useRef<Battle | null>(null);

  const displayName = role === "audience" ? (creatorName || userName) : "You";
  const resolvedChallengeTitle = challengeTitle || hostMetadata?.title;

  useEffect(() => {
    liveOnChainAddressRef.current = liveOnChainAddress;
  }, [liveOnChainAddress]);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    if (streamEnded) {
      return;
    }

    let cancelled = false;

    const refreshTopTipper = async () => {
      try {
        const response = await fetch(
          `/api/contributions?scope=LIVE&liveStreamId=${encodeURIComponent(channelName)}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          return;
        }

        const payload = await response.json().catch(() => null);
        const contributions = Array.isArray(payload?.contributions) ? payload.contributions : [];
        const totals = new Map<string, number>();

        for (const contribution of contributions) {
          const wallet = typeof contribution?.fanWalletAddress === "string" ? contribution.fanWalletAddress : "";
          const amount = Number(contribution?.amountSol ?? 0);

          if (!wallet || !Number.isFinite(amount) || amount <= 0) {
            continue;
          }

          totals.set(wallet, (totals.get(wallet) ?? 0) + amount);
        }

        let currentTopTipper: { address: string; amountSol: number } | null = null;

        for (const [address, amountSol] of totals.entries()) {
          if (!currentTopTipper || amountSol > currentTopTipper.amountSol) {
            currentTopTipper = { address, amountSol };
          }
        }

        if (!cancelled) {
          setTopTipper(currentTopTipper);
        }
      } catch (error) {
        if (!cancelled) {
          setTopTipper(null);
        }
        console.debug("Top tipper polling error:", error);
      }
    };

    void refreshTopTipper();
    const refreshTimer = window.setInterval(refreshTopTipper, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [channelName, messageRefreshKey, streamEnded]);

  const giftAmounts = [0.1, 0.5, 1, 5, 10, 20];

  const stageBattleForAfterLiveEnd = useCallback((battle: Battle) => {
    if (battleHandledRef.current === battle.id) {
      return;
    }

    const normalizedBattle: Battle = {
      ...battle,
      startedAt: new Date(battle.startedAt as unknown as string),
      pairedAt: new Date(battle.pairedAt as unknown as string),
      endedAt: battle.endedAt ? new Date(battle.endedAt as unknown as string) : null,
    };

    battleHandledRef.current = battle.id;
    pendingBattleRef.current = normalizedBattle;
    sochal.setActiveBattle(normalizedBattle);
  }, []);

  const transitionToBattle = useCallback(async (battle: Battle) => {
    if (battleHandledRef.current === battle.id) {
      return;
    }

    const normalizedBattle: Battle = {
      ...battle,
      startedAt: new Date(battle.startedAt as unknown as string),
      pairedAt: new Date(battle.pairedAt as unknown as string),
      endedAt: battle.endedAt ? new Date(battle.endedAt as unknown as string) : null,
    };

    if (role === "host") {
      stageBattleForAfterLiveEnd(normalizedBattle);
      return;
    }

    battleHandledRef.current = battle.id;
    sochal.setActiveBattle(normalizedBattle);
    onEndRef.current();
  }, [role, stageBattleForAfterLiveEnd]);

  const doCloseOnce = useCallback(async (liveAddress: string, force: boolean) => {
    if (!liveAddress) return;
    if (closeInProgressRef.current) return;

    closeInProgressRef.current = true;

    try {
      await closeLiveOnChain({ liveAddress, force });
    } catch (err) {
      // Reset so callers may retry on failure
      closeInProgressRef.current = false;
      throw err;
    }
  }, []);

  const registerHostStream = async () => {
    if (!hostMetadata) return;

    await fetch("/api/live-streams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channelName,
        ownerWallet: hostMetadata.ownerWallet,
        onChainAddress: hostMetadata.onChainAddress,
        challengeId: hostMetadata.challengeId,
        handle: hostMetadata.handle,
        displayName: userName,
        topic: hostMetadata.topic,
        title: hostMetadata.title,
        targetSol: hostMetadata.targetSol,
        potSol: 0,
      }),
    });
  };

  const sendHeartbeat = async () => {
    await fetch("/api/live-streams", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channelName,
      }),
    });
  };

  const updateViewerPresence = async (delta: number) => {
    await fetch("/api/live-streams", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channelName,
        viewerDelta: delta,
      }),
    });
  };

  const releaseAgoraResources = useCallback(async (options?: { endStream?: boolean }) => {
    const shouldEndStream = options?.endStream ?? false;

    localTracksRef.current.forEach((track) => {
      if (track) {
        track.stop();
        track.close();
      }
    });
    localTracksRef.current = [];

    if (clientRef.current) {
      const client = clientRef.current;
      clientRef.current = null;

      if (client.connectionState !== "DISCONNECTED") {
      try {
        await client.leave();
      } catch (leaveError) {
        const message = leaveError instanceof Error ? leaveError.message : String(leaveError);

        if (!message.includes("WS_ABORT") && !message.includes("LEAVE")) {
          console.error("Agora leave error:", leaveError);
        }
      }
      }
    }

    remoteUsersRef.current.clear();

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    if (role === "audience" && viewerJoinedRef.current) {
      await fetch("/api/live-streams", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelName,
          viewerDelta: -1,
        }),
      });
      viewerJoinedRef.current = false;
    }

    if (shouldEndStream && role === "host") {
      streamingService.endStream(channelName);
      await fetch("/api/live-streams", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelName,
        }),
      });
    }
  }, [channelName, role]);

  useEffect(() => {
    let mounted = true;
    let initTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const initAgora = async () => {
      // Prevent concurrent initialization calls
      if (isInitializingRef.current) {
        console.warn("Agora initialization already in progress, skipping duplicate call");
        return;
      }

      isInitializingRef.current = true;

      // Set a 15-second timeout for the entire initialization
      if (initTimeoutId) clearTimeout(initTimeoutId);
      initTimeoutId = setTimeout(() => {
        if (mounted && isInitializingRef.current) {
          console.error("Agora initialization timeout after 15 seconds");
          setError("Connection timeout. Please try again.");
          setLoading(false);
          isInitializingRef.current = false;
        }
      }, 15000);

      try {
        if (typeof window === "undefined") {
          isInitializingRef.current = false;
          return;
        }

        // Do not initialize Agora until required permissions are granted.
        await requestStreamingPermissions(role);

        // Release any previous client before creating a new one
        if (clientRef.current) {
          try {
            console.log("Releasing previous Agora client before retry...");
            await releaseAgoraResources();
            // Small delay to allow server-side session cleanup
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (e) {
            console.warn("Error releasing previous client:", e);
          }
        }

        // Generate a fresh UID for this connection attempt to avoid UID conflicts
        uidRef.current = generateAgoraUid();
        console.log(`[Agora] Starting connection with uid: ${uidRef.current}`);

        setConnectionState("connecting");
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;

        // Hide SDK-level console noise (e.g. UID_CONFLICT) and handle errors via app UI/state.
        AgoraRTC.setLogLevel(4);

        const client = AgoraRTC.createClient({
          mode: "live",
          codec: "vp8",
        });

        clientRef.current = client;

        // Fetch token with unique numeric UID
        console.log("[Agora] Fetching token...");
        const response = await fetch("/api/agora/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channelName,
            uid: uidRef.current,
            role,
          }),
        });

        if (!response.ok) {
          throw new Error(`Token fetch failed: ${response.statusText}`);
        }

        const data: AgoraTokenResponse = await response.json();
        const requestedUid = uidRef.current;

        if (!data.token) {
          throw new Error("No token received from server");
        }

        if (data.error) {
          throw new Error(data.error);
        }

        const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID;
        
        if (!APP_ID) {
          throw new Error("Agora App ID not configured");
        }

        // Setup connection state listeners
        client.on("connection-state-change", (curState: string, prevState: string, reason: string) => {
          console.log(`Connection state: ${prevState} -> ${curState}, reason: ${reason}`);
          if (curState === "CONNECTED") {
            setConnectionState("connected");
            connectionAttemptsRef.current = 0;
          } else if (curState === "DISCONNECTED") {
            setConnectionState("disconnected");
          }
        });

        // Setup user-published event for receiving remote streams
        client.on("user-published", async (user: any, mediaType: any) => {
          if (role !== "audience") {
            return;
          }

          if (client.connectionState !== "CONNECTED") {
            return;
          }

          try {
            await client.subscribe(user, mediaType);
            remoteUsersRef.current.set(user.uid, user);

            if (mediaType === "video") {
              if (remoteVideoRef.current) {
                user.videoTrack.play(remoteVideoRef.current);
              }
            }

            if (mediaType === "audio") {
              user.audioTrack.play();
            }
          } catch (err: any) {
            console.error("Subscribe error:", err);
          }
        });

        // Setup user-left event to remove remote streams
        client.on("user-left", (user: any) => {
          remoteUsersRef.current.delete(user.uid);
        });

        // Setup user-info-updated for track updates
        client.on("user-info-updated", (uid: string | number, msg: string) => {
          console.log(`User ${uid} info updated: ${msg}`);
        });

        if (typeof data.uid !== "number" || data.uid <= 0) {
          throw new Error("Token response missing valid numeric uid");
        }

        if (data.uid !== requestedUid) {
          console.warn(`[Agora] Token uid mismatch: requested=${requestedUid}, received=${data.uid}`);
        }

        const joinUid = data.uid;
        console.log(`[Agora] Joining channel: ${channelName} with uid: ${joinUid}`);
        
        await client.join(APP_ID, channelName, data.token, joinUid);
        
        console.log(`[Agora] Successfully joined channel`);

        // After joining, subscribe to any already-published remote users (ensures viewers see host when they join later)
        if (role === "audience" && client.connectionState === "CONNECTED") {
          const remoteUsers = (client.remoteUsers ?? []) as Array<any>;
          try {
            for (const ru of remoteUsers) {
              try {
                const remoteUser = ru as any;

                if (remoteUser && remoteUser.uid !== joinUid) {
                  // subscribe to published tracks
                  if (remoteUser.hasVideo) {
                    await client.subscribe(remoteUser, "video");
                    if (remoteVideoRef.current && remoteUser.videoTrack) {
                      remoteUser.videoTrack.play(remoteVideoRef.current);
                    }
                  }

                  if (remoteUser.hasAudio) {
                    await client.subscribe(remoteUser, "audio");
                    if (remoteUser.audioTrack) remoteUser.audioTrack.play();
                  }
                  remoteUsersRef.current.set(remoteUser.uid, remoteUser);
                }
              } catch (e) {
                // ignore individual subscribe failures
                console.warn("Failed subscribing to existing remote user", e);
              }
            }
          } catch (e) {
            // non-fatal
          }
        }

        // Set appropriate client role
        await client.setClientRole(role === "host" ? "host" : "audience");

        if (mounted) {
          console.log(`[Agora] Join complete, clearing loading state`);
          if (initTimeoutId) clearTimeout(initTimeoutId);
          setLoading(false);
          connectionAttemptsRef.current = 0;
        }

        // HOST: Publish local video and audio
        if (role === "host") {
          try {
            console.log(`[Agora] Creating microphone and camera tracks...`);
            const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
            console.log(`[Agora] Tracks created successfully`);

            localTracksRef.current = tracks;

            // Publish tracks to channel
            console.log(`[Agora] Publishing tracks...`);
            await client.publish(tracks);
            console.log(`[Agora] Tracks published successfully`);

            // Play local video
            if (localVideoRef.current) {
              tracks[1].play(localVideoRef.current);
            }
          } catch (err: any) {
            console.error("Error creating/publishing tracks:", err);
            
            // Provide user-friendly error message for device/permission issues
            let userMessage = "Failed to start streaming";
            if (err.message?.includes("NOT_READABLE") || err.message?.includes("NotReadableError")) {
              userMessage = "Camera/microphone is already in use or not accessible. Please check your device permissions and try again.";
            } else if (err.message?.includes("NotAllowed") || err.message?.includes("Permission")) {
              userMessage = "Permission denied. Please allow camera and microphone access and try again.";
            }
            
            throw new Error(userMessage);
          }
        }

        if (mounted) {
          // Run host bookkeeping after the visible stream is ready.
          if (role === "host") {
            streamingService.startStream({
              channelName,
              hostId: String(uidRef.current),
              hostName: userName,
              startedAt: Date.now(),
              viewers: 1,
            });

            void (async () => {
              try {
                await registerHostStream();
                await sendHeartbeat();

                if (heartbeatRef.current) {
                  clearInterval(heartbeatRef.current);
                }

                heartbeatRef.current = setInterval(() => {
                  sendHeartbeat().catch(() => {
                    // no-op; stale stream cleanup handles transient failures
                  });
                }, 15_000);
              } catch (hostSyncError) {
                console.error("Host stream bookkeeping error:", hostSyncError);
              }
            })();
          } else if (!viewerJoinedRef.current) {
            void updateViewerPresence(1).catch((presenceError) => {
              console.warn("Viewer presence update failed:", presenceError);
            });
            viewerJoinedRef.current = true;
          }

          // Fetch current stream metadata (viewers) and update local state
          void (async () => {
            try {
              const res = await fetch(`/api/live-streams?channelName=${encodeURIComponent(channelName)}`, { cache: "no-store" });
              if (res.ok) {
                const body = await res.json();
                const stream = body.stream;
                if (stream && typeof stream.viewers === "number") {
                  setViewers(stream.viewers);
                }
                if (stream && typeof stream.potSol === "number") {
                  setTips(stream.potSol);
                }
                if (stream && typeof stream.targetSol === "number") {
                  setLiveTargetAmountSol(stream.targetSol);
                }
                if (stream && typeof stream.onChainAddress === "string") {
                  setLiveOnChainAddress(stream.onChainAddress);
                }
              }
            } catch (e) {
              // ignore metadata fetch errors
            }
          })();
        }
      } catch (err: any) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const isUidConflict = errorMsg.includes("UID_CONFLICT");

        if (!isUidConflict) {
          console.error("Agora initialization error:", err);
        }

        if (mounted) {
          if (!isUidConflict) {
            setError(errorMsg || "Failed to connect to stream");
            setLoading(false);
          }

          // Clean up any partial join before retrying so we do not reuse the same identity.
          await releaseAgoraResources();

          // Retry UID conflicts with a fresh UID, but keep permission/device failures manual.
          const isPermissionError =
            errorMsg.includes("NOT_READABLE") ||
            errorMsg.includes("Permission") ||
            errorMsg.includes("NotAllowed");

          // Attempt reconnection with exponential backoff (only for transient errors)
          if (!isPermissionError && connectionAttemptsRef.current < maxReconnectAttemptsRef.current) {
            connectionAttemptsRef.current += 1;
            const backoffTime = isUidConflict
              ? 600
              : Math.pow(2, connectionAttemptsRef.current) * 1000;
            console.log(`Attempting reconnection in ${backoffTime}ms (attempt ${connectionAttemptsRef.current})`);

            setTimeout(() => {
              if (mounted) {
                initAgora();
              }
            }, backoffTime);
          }
        }
      } finally {
        isInitializingRef.current = false;
        if (initTimeoutId) clearTimeout(initTimeoutId);
      }
    };

    initAgora();

    return () => {
      mounted = false;
      if (initTimeoutId) clearTimeout(initTimeoutId);
      isInitializingRef.current = false;

      const cleanup = async () => {
        try {
          await releaseAgoraResources({ endStream: role === "host" });
        } catch (e) {
          console.error("Cleanup error:", e);
        }
      };

      cleanup();
    };
  }, [channelName, role, releaseAgoraResources, stageBattleForAfterLiveEnd, transitionToBattle]);

  // Poll for messages from API
  useEffect(() => {
    if (loading || error || streamEnded) {
      return;
    }

    let pollInterval: NodeJS.Timeout | null = null;

    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `/api/live-streams/messages?channelName=${encodeURIComponent(channelName)}`,
          { cache: "no-store" }
        );

        if (!response.ok) return;

        const data = await response.json();
        const apiMessages = data.messages || [];

        setMessages((prevMessages:any) => {
          // Get IDs of existing messages to avoid duplicates
          const existingIds = prevMessages
            .map((m:any) => m.id)
            .filter(Boolean);

          // Add only new messages from API
          const newMessages = apiMessages.filter(
            (m: any) =>
              !existingIds.includes(m.id) && m.user !== "System"
          );

          return newMessages.length > 0 ? [...prevMessages, ...newMessages] : prevMessages;
        });
      } catch (err) {
        // Silently fail on polling errors
        console.debug("Message polling error:", err);
      }
    };

    // Initial fetch
    fetchMessages();

    // Poll every 1 second
    pollInterval = setInterval(fetchMessages, 1000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [channelName, messageRefreshKey, loading, error, streamEnded]);

  useEffect(() => {
    if (role === "audience" && streamEnded) {
      toast.info("The creator closed this live.");
    }
  }, [role, streamEnded]);

  useEffect(() => {
    let poll: NodeJS.Timeout | null = null;

    const checkStream = async () => {
      try {
        const res = await fetch(`/api/live-streams?channelName=${encodeURIComponent(channelName)}`, { cache: "no-store" });
        if (!res.ok) {
          // stream not found -> ended
          setStreamEnded(true);
          await releaseAgoraResources();
          if (poll) clearInterval(poll);
          return;
        }

        const body = await res.json();
        const stream = body.stream;

        const battle = stream?.battle as Battle | null | undefined;
        if (battle && battleHandledRef.current !== battle.id) {
          if (role === "host") {
            stageBattleForAfterLiveEnd(battle);

            if (!stream?.isLive) {
              onEndRef.current();
            }

            return;
          }

          await transitionToBattle(battle);
          return;
        }

        if (!stream || !stream.isLive) {
          setStreamEnded(true);
          await releaseAgoraResources();
          if (poll) clearInterval(poll);
        } else {
          // Update live metadata so all participants (creator and fans) see real-time pot/target/viewers
          if (typeof stream.viewers === "number") {
            setViewers(stream.viewers);
          }

          if (typeof stream.potSol === "number") {
            setTips(stream.potSol);
          }

          if (typeof stream.targetSol === "number") {
            setLiveTargetAmountSol(stream.targetSol);
          }

          if (typeof stream.onChainAddress === "string") {
            setLiveOnChainAddress(stream.onChainAddress);
          }
        }
      } catch (e) {
        // ignore polling errors
      }
    };

    // initial check
    checkStream();
    poll = setInterval(checkStream, 2000);

    return () => {
      if (poll) clearInterval(poll);
    };
  }, [channelName, role, releaseAgoraResources, stageBattleForAfterLiveEnd, transitionToBattle]);

  const toggleMic = async () => {
    const audioTrack = localTracksRef.current[0];

    if (!audioTrack) {
      setError("Audio track not available");
      return;
    }

    try {
      await audioTrack.setEnabled(isMuted);
      setIsMuted(!isMuted);
    } catch (err: any) {
      console.error("Error toggling microphone:", err);
      setError("Failed to toggle microphone");
    }
  };

  const toggleVideo = async () => {
    const videoTrack = localTracksRef.current[1];

    if (!videoTrack) {
      setError("Video track not available");
      return;
    }

    try {
      await videoTrack.setEnabled(isVideoOff);
      setIsVideoOff(!isVideoOff);
    } catch (err: any) {
      console.error("Error toggling video:", err);
      setError("Failed to toggle video");
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    const messageText = message;
    setMessage("");

    // Send message to API for persistence and broadcasting
    try {
      const response = await fetch("/api/live-streams/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelName,
          userName,
          displayName: userName,
          text: messageText,
        }),
      });

      if (!response.ok) {
        console.error("Failed to send message");
        return;
      }

      // Trigger a refresh of messages
      setMessageRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  useEffect(() => {
    if (role !== "host") {
      return;
    }

    if (!liveTargetAmountSol || tips < liveTargetAmountSol || targetCelebrationShownRef.current) {
      return;
    }

    targetCelebrationShownRef.current = true;
    setAchievementCelebration(true);

    const celebrationTimer = window.setTimeout(() => {
      setAchievementCelebration(false);
      setTargetCountdownEndsAt(Date.now() + 30 * 60 * 1000);
    }, 5000);

    return () => window.clearTimeout(celebrationTimer);
  }, [role, tips, liveTargetAmountSol]);

  useEffect(() => {
    if (role !== "host" || targetCountdownEndsAt === null) {
      return;
    }

    const countdownTimer = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => window.clearInterval(countdownTimer);
  }, [role, targetCountdownEndsAt]);

  useEffect(() => {
    if (role !== "host" || targetCountdownEndsAt === null || !liveOnChainAddress) {
      return;
    }

    const remainingMs = targetCountdownEndsAt - Date.now();

    if (remainingMs <= 0) {
      void (async () => {
        try {
          await doCloseOnce(liveOnChainAddress, false);
        } catch (error) {
          console.error("Failed to auto-close live after target countdown:", error);
        } finally {
          await releaseAgoraResources({ endStream: true });
          onEnd();
        }
      })();

      return;
    }

    const closeTimer = window.setTimeout(() => {
      void (async () => {
        try {
          await doCloseOnce(liveOnChainAddress, false);
        } catch (error) {
          console.error("Failed to auto-close live after target countdown:", error);
        } finally {
          await releaseAgoraResources({ endStream: true });
          onEnd();
        }
      })();
    }, remainingMs);

    return () => window.clearTimeout(closeTimer);
  }, [countdownNow, liveOnChainAddress, onEnd, releaseAgoraResources, role, targetCountdownEndsAt, doCloseOnce]);

  const sendTip = async (amount: number) => {
    if (sendingAmount !== null) return; // already sending another amount

    if (!liveOnChainAddress) {
      toast.error("This live does not have an on-chain payment address yet.");
      return;
    }

    setSendingAmount(amount);

    try {
      const { tipLiveSignature } = await tipLiveOnChain({
        liveAddress: liveOnChainAddress,
        amountSol: amount,
      });

      const response = await fetch("/api/live-streams", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelName,
          potDelta: amount,
        }),
      });

      if (!response.ok) {
        throw new Error("Gift payment succeeded, but live progress update failed.");
      }

      const payload = await response.json().catch(() => null);
      const nextPot =
        typeof payload?.stream?.potSol === "number"
          ? payload.stream.potSol
          : tips + amount;

      setTips(nextPot);
      setTipCelebration({ amountSol: amount, creatorLabel: displayName });

      const fanWalletAddress = sochal.get().wallet?.address;
      if (fanWalletAddress) {
        const contributionResponse = await fetch("/api/contributions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            txSignature: tipLiveSignature,
            scope: "LIVE",
            fanWalletAddress,
            amountSol: amount,
            liveStreamId: channelName,
            fanHandle: sochal.get().profile?.handle,
            fanDisplayName: sochal.get().profile?.displayName,
          }),
        });

        if (contributionResponse.ok) {
          const contributionPayload = await contributionResponse.json().catch(() => null);
          const battle = contributionPayload?.pairing?.battle as Battle | undefined;

          if (battle && role === "host") {
            stageBattleForAfterLiveEnd(battle);
          }
        }
      }

      const tipMessage = `🎁 Sent ${amount} SOL`;
      await fetch("/api/live-streams/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelName,
          userName,
          displayName: userName,
          text: tipMessage,
          isTip: true,
        }),
      }).catch((error) => {
        console.error("Error sending tip message:", error);
      });

      setMessageRefreshKey((prev) => prev + 1);
      toast.success(`Sent ${amount} SOL gift successfully.`);
    } catch (error) {
      console.error("Tip payment failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send gift"
      );
    } finally {
      setSendingAmount(null);
      setShowGiftModal(false);
    }
  };

  const shareStream = async () => {
    try {
      const url = `${window.location.origin}/live/${channelName}`;

      await navigator.clipboard.writeText(url);

      toast.success("Link copied!");
    } catch (e) {
      console.log(e);
    }
  };

  const endStream = async () => {
    try {
      setConnectionState("disconnected");

      if (role === "host" && liveOnChainAddress && (tips >= liveTargetAmountSol && liveTargetAmountSol > 0 || targetCountdownEndsAt !== null)) {
        try {
          await doCloseOnce(liveOnChainAddress, true);
        } catch (error) {
          console.error("Failed to force close live on host exit:", error);
        }
      }

      // If the creator has already hit target, leaving should close the live
      // on-chain so payouts can be settled immediately.

      await releaseAgoraResources({ endStream: role === "host" });
    } catch (e: any) {
      console.error("Error ending stream:", e);
      setError(e.message || "Failed to end stream");
    } finally {
      onEnd();
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

  // If stream ended (creator stopped), show notification to audience
  if (streamEnded && role === "audience") {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="bg-zinc-900 rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-white text-2xl font-bold mb-4">Host Ended Stream</h2>
          <p className="text-gray-300 mb-6">The creator has stopped streaming. You will be returned to the home page.</p>
          <div className="flex justify-center">
            <Button onClick={onEnd}>Back Home</Button>
          </div>
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
        <div className="flex size-12 items-center justify-center rounded-full bg-pink-500 font-bold text-white">
          {displayName.charAt(0)}
        </div>

        <div>
          <p className="font-semibold text-white">{displayName}</p>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-red-500 px-2 py-1 text-xs text-white">
              LIVE
            </span>

            <span className="text-sm text-white">{viewers} viewers</span>
          </div>

          <div className="mt-2 w-56 rounded-xl bg-black/30 p-2">
            <div className="flex items-center justify-between px-1 text-[10px] text-zinc-300">
              <span>{tips.toFixed(2)} SOL raised</span>
              <span>{liveTargetAmountSol.toFixed(2)} target</span>
            </div>

            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-300"
                style={{
                  width:
                    liveTargetAmountSol > 0
                      ? `${Math.min(100, (tips / liveTargetAmountSol) * 100)}%`
                      : "0%",
                }}
              />
            </div>

            <div className="mt-2 text-[11px] text-zinc-300">
              {topTipper ? (
                <>
                  Top tipper: {topTipper.amountSol.toFixed(2)} SOL from {topTipper.address.slice(0, 4)}...{topTipper.address.slice(-4)}
                </>
              ) : (
                <>Top tipper: waiting for first leader</>
              )}
            </div>
          </div>
        </div>
      </div>

      {resolvedChallengeTitle ? (
        <div className="absolute top-5 right-4 z-20 max-w-[48vw] rounded-full border border-white/10 bg-black/50 px-4 py-2 text-right backdrop-blur-md sm:max-w-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-pink-300">
            Challenge
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-white">
            {resolvedChallengeTitle}
          </p>
        </div>
      ) : null}

      {tipCelebration && (
        <TipCelebration
          amountSol={tipCelebration.amountSol}
          creatorLabel={tipCelebration.creatorLabel}
          onFinished={() => setTipCelebration(null)}
        />
      )}

      {achievementCelebration && (
        <TipCelebration
          amountSol={liveTargetAmountSol}
          creatorLabel={displayName}
          mode="achievement"
          onFinished={() => setAchievementCelebration(false)}
        />
      )}

      {targetCountdownEndsAt !== null && !achievementCelebration && (
        <div className="absolute top-24 left-1/2 z-30 -translate-x-1/2 rounded-full border border-yellow-400/30 bg-black/70 px-4 py-2 text-center shadow-[0_0_40px_rgba(250,204,21,0.18)] backdrop-blur-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-yellow-300">Live close countdown</p>
          <p className="mt-1 text-lg font-black text-white">
            {Math.max(0, Math.floor((targetCountdownEndsAt - countdownNow) / 1000 / 60))}m {Math.max(0, Math.floor(((targetCountdownEndsAt - countdownNow) / 1000) % 60))}s
          </p>
        </div>
      )}

      {/* FAN LEAVE BUTTON */}
      {role === "audience" && (
        <div className="absolute left-4 bottom-8 z-20">
          <button
            onClick={endStream}
            className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition hover:bg-red-400"
          >
            <PhoneOff className="size-4" />
            Leave Live
          </button>
        </div>
      )}

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

        <button onClick={() => setShowGiftModal(true)} disabled={sendingAmount !== null}>
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
            {messages.map((msg, i) => {
              // Show "You" for messages from the current user, otherwise show the sender's name
              const displayName =
                msg.userName === userName ? "You" : msg.user;

              return (
                <div
                  key={msg.id || i}
                  className={`text-sm ${
                    msg.isTip
                      ? "bg-yellow-500/20 rounded-lg p-2"
                      : ""
                  }`}
                >
                  <span className="text-pink-400 font-semibold">
                    {displayName}:{" "}
                  </span>

                  <span className="text-white">
                    {msg.text}
                  </span>
                </div>
              );
            })}
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
                  disabled={sendingAmount === amount}
                  className="h-20 rounded-2xl bg-pink-500/20 text-pink-400 font-bold transition hover:bg-pink-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingAmount === amount ? "Sending..." : `${amount} SOL`}
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