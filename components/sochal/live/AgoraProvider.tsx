"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import AgoraRTC, { 
  IAgoraRTCClient, 
  ILocalAudioTrack, 
  ILocalVideoTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  UID
} from "agora-rtc-sdk-ng";

interface AgoraContextType {
  client: IAgoraRTCClient | null;
  localAudioTrack: ILocalAudioTrack | null;
  localVideoTrack: ILocalVideoTrack | null;
  remoteUsers: Map<UID, { videoTrack?: IRemoteVideoTrack; audioTrack?: IRemoteAudioTrack }>;
  joinChannel: (channelName: string, role: "host" | "audience", userName: string) => Promise<void>;
  leaveChannel: () => Promise<void>;
  toggleAudio: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isJoined: boolean;
  error: string | null;
}

const AgoraContext = createContext<AgoraContextType | undefined>(undefined);

export function AgoraProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<ILocalAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<Map<UID, any>>(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<"host" | "audience">("audience");

  useEffect(() => {
    const rtcClient = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    setClient(rtcClient);

    // Handle remote user publishing
    rtcClient.on("user-published", async (user, mediaType) => {
      await rtcClient.subscribe(user, mediaType);
      
      const newRemoteUsers = new Map(remoteUsers);
      
      if (mediaType === "video" && user.videoTrack) {
        newRemoteUsers.set(user.uid, {
          ...newRemoteUsers.get(user.uid),
          videoTrack: user.videoTrack,
        });
      }
      if (mediaType === "audio" && user.audioTrack) {
        newRemoteUsers.set(user.uid, {
          ...newRemoteUsers.get(user.uid),
          audioTrack: user.audioTrack,
        });
        user.audioTrack.play();
      }
      
      setRemoteUsers(newRemoteUsers);
    });

    rtcClient.on("user-unpublished", (user, mediaType) => {
      const newRemoteUsers = new Map(remoteUsers);
      const userData = newRemoteUsers.get(user.uid);
      
      if (userData) {
        if (mediaType === "video") {
          userData.videoTrack?.stop();
          delete userData.videoTrack;
        }
        if (mediaType === "audio") {
          userData.audioTrack?.stop();
          delete userData.audioTrack;
        }
        
        if (!userData.videoTrack && !userData.audioTrack) {
          newRemoteUsers.delete(user.uid);
        } else {
          newRemoteUsers.set(user.uid, userData);
        }
      }
      
      setRemoteUsers(newRemoteUsers);
    });

    rtcClient.on("user-left", (user) => {
      const newRemoteUsers = new Map(remoteUsers);
      const userData = newRemoteUsers.get(user.uid);
      userData?.videoTrack?.stop();
      userData?.audioTrack?.stop();
      newRemoteUsers.delete(user.uid);
      setRemoteUsers(newRemoteUsers);
    });

    return () => {
      localAudioTrack?.close();
      localVideoTrack?.close();
      rtcClient.leave();
      rtcClient.removeAllListeners();
    };
  }, []);

  const joinChannel = async (channelName: string, role: "host" | "audience", userName: string) => {
    if (!client) {
      setError("Client not initialized");
      return;
    }

    setError(null);
    setCurrentRole(role);

    try {
      // Get token from API
      const response = await fetch("/api/agora/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelName,
          uid: 0,
          role,
        }),
      });
      
      const { token } = await response.json();
      
      if (!token) {
        throw new Error("Failed to get token");
      }

      // Set client role
      await client.setClientRole(role === "host" ? "host" : "audience");
      
      // Join channel
      await client.join(
        process.env.NEXT_PUBLIC_AGORA_APP_ID!,
        channelName,
        token,
        0
      );

      if (role === "host") {
        // Create local tracks
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        
        // Publish tracks
        await client.publish([audioTrack, videoTrack]);
        
        // Play local video
        videoTrack.play("local-video", { fit: "cover" });
        
        setIsAudioEnabled(true);
        setIsVideoEnabled(true);
      }

      setIsJoined(true);
    } catch (err: any) {
      console.error("Join channel error:", err);
      setError(err.message || "Failed to join channel");
    }
  };

  const leaveChannel = async () => {
    if (!client) return;

    try {
      if (localAudioTrack) {
        localAudioTrack.close();
        setLocalAudioTrack(null);
      }
      if (localVideoTrack) {
        localVideoTrack.close();
        setLocalVideoTrack(null);
      }
      
      await client.leave();
      setIsJoined(false);
      setRemoteUsers(new Map());
    } catch (err) {
      console.error("Leave channel error:", err);
    }
  };

  const toggleAudio = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  return (
    <AgoraContext.Provider
      value={{
        client,
        localAudioTrack,
        localVideoTrack,
        remoteUsers,
        joinChannel,
        leaveChannel,
        toggleAudio,
        toggleVideo,
        isAudioEnabled,
        isVideoEnabled,
        isJoined,
        error,
      }}
    >
      {children}
    </AgoraContext.Provider>
  );
}

export function useAgora() {
  const context = useContext(AgoraContext);
  if (!context) {
    throw new Error("useAgora must be used within AgoraProvider");
  }
  return context;
}