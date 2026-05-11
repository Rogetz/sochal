"use client";

import { useEffect, useRef, useState } from "react";
import { useAgora } from "./AgoraProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Users, 
  Share2, X, MessageCircle, Send 
} from "lucide-react";

interface AgoraLiveStreamProps {
  channelName: string;
  role: "host" | "audience";
  userName: string;
  onEnd: () => void;
}

export function AgoraLiveStream({ channelName, role, userName, onEnd }: AgoraLiveStreamProps) {
  const [isJoining, setIsJoining] = useState(true);
  const [viewers, setViewers] = useState(0);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ user: string; text: string }[]>([]);
  const [showChat, setShowChat] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const {
    joinChannel,
    leaveChannel,
    toggleAudio,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled,
    isJoined,
    remoteUsers,
    error,
  } = useAgora();

  useEffect(() => {
    const init = async () => {
      await joinChannel(channelName, role, userName);
      setIsJoining(false);
    };
    init();

    return () => {
      leaveChannel();
    };
  }, [channelName, role, userName]);

  useEffect(() => {
    setViewers(remoteUsers.size + (role === "host" ? 1 : 0));
  }, [remoteUsers.size, role]);

  const sendMessage = () => {
    if (message.trim()) {
      setMessages([...messages, { user: userName, text: message }]);
      setMessage("");
    }
  };

  const handleEnd = async () => {
    await leaveChannel();
    onEnd();
  };

  const copyInviteLink = async () => {
    const url = `${window.location.origin}/live/${channelName}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isJoining) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="size-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Joining {role === "host" ? "live stream" : "stream"}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="size-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <PhoneOff className="size-10 text-red-400" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Connection Error</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <Button onClick={onEnd} className="bg-blue-600">Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Video Container */}
      <div className="relative w-full h-full">
        {/* Remote Videos Grid */}
        <div 
          id="remote-video-grid" 
          className={`grid gap-2 p-2 h-full ${remoteUsers.size === 0 ? "" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}
        >
          {remoteUsers.size === 0 && role === "audience" && (
            <div className="col-span-full flex items-center justify-center h-full">
              <div className="text-center">
                <div className="size-32 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Users className="size-16 text-blue-400" />
                </div>
                <p className="text-white text-xl">Waiting for host to start...</p>
                <p className="text-gray-400 mt-2">The host hasn't started the stream yet</p>
              </div>
            </div>
          )}
          
          {Array.from(remoteUsers.entries()).map(([uid, user]) => (
            <div key={uid} className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
              <div 
                id={`remote-video-${uid}`} 
                className="w-full h-full"
              />
              <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-xs">
                Viewer {String(uid).slice(-4)}
              </div>
            </div>
          ))}
        </div>

        {/* Local Video (Host) */}
        {role === "host" && (
          <div className="absolute bottom-4 right-4 z-20 w-48 h-36 rounded-xl overflow-hidden border-2 border-blue-500 shadow-lg bg-gray-900">
            <div id="local-video" className="w-full h-full" />
            <div className="absolute bottom-1 left-2 bg-black/50 px-1.5 py-0.5 rounded text-white text-[10px]">
              You (Host)
            </div>
          </div>
        )}

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="size-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-white text-sm font-medium">LIVE</span>
              </div>
              <div className="flex items-center gap-1 bg-black/50 rounded-full px-3 py-1">
                <Users className="size-3 text-gray-400" />
                <span className="text-white text-sm">{viewers} watching</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={copyInviteLink}
                className="size-8 rounded-full bg-black/50 flex items-center justify-center"
              >
                <Share2 className="size-4 text-white" />
              </button>
              {copied && (
                <span className="text-green-400 text-xs bg-black/50 rounded px-2 py-1">Copied!</span>
              )}
              <Button onClick={handleEnd} className="bg-red-500 hover:bg-red-600 size-8 rounded-full p-0">
                <PhoneOff className="size-4" />
              </Button>
              <button onClick={() => window.history.back()} className="size-8 rounded-full bg-black/50 flex items-center justify-center">
                <X className="size-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Host Controls */}
        {role === "host" && isJoined && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-4 z-10">
            <button 
              onClick={toggleAudio} 
              className="size-12 rounded-full bg-black/60 backdrop-blur flex items-center justify-center hover:bg-black/80 transition"
            >
              {isAudioEnabled ? <Mic className="size-6 text-white" /> : <MicOff className="size-6 text-white" />}
            </button>
            <button 
              onClick={toggleVideo} 
              className="size-12 rounded-full bg-black/60 backdrop-blur flex items-center justify-center hover:bg-black/80 transition"
            >
              {isVideoEnabled ? <Video className="size-6 text-white" /> : <VideoOff className="size-6 text-white" />}
            </button>
          </div>
        )}

        {/* Chat Panel */}
        <div className={`absolute right-0 top-20 bottom-20 bg-black/90 backdrop-blur-md border-l border-gray-800 transition-all duration-300 z-10 ${showChat ? 'w-80' : 'w-0 overflow-hidden'}`}>
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-3 border-b border-gray-800">
              <h3 className="text-white font-semibold">Chat ({messages.length})</h3>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((msg, i) => (
                <div key={i} className="text-sm">
                  <span className="text-blue-400 font-semibold">{msg.user}: </span>
                  <span className="text-white">{msg.text}</span>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-800">
              <div className="flex gap-2">
                <Input 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)} 
                  placeholder="Say something..." 
                  className="flex-1 bg-gray-800 border-gray-700 text-white text-sm" 
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()} 
                />
                <Button onClick={sendMessage} size="sm" className="bg-blue-600">
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Chat Button */}
        {!showChat && (
          <button 
            onClick={() => setShowChat(true)} 
            className="fixed right-4 top-24 size-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg z-10"
          >
            <MessageCircle className="size-5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}