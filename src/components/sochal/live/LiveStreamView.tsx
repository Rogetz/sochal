import { useState, useEffect, useRef } from "react";
import { mediaService } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Mic, MicOff, Video, VideoOff, X, Send, Users, 
  FlipHorizontal, Share2, UserPlus, Copy, Check,
  MessageCircle, AlertCircle
} from "lucide-react";

interface LiveStreamViewProps {
  streamId: string;
  streamTitle?: string;
  creatorName?: string;
  creatorHandle?: string;
  creatorAvatar?: string;
  isCreator: boolean;
  onEnd: () => void;
}

export function LiveStreamView({ 
  streamId, 
  streamTitle, 
  creatorName, 
  creatorHandle, 
  creatorAvatar,
  isCreator, 
  onEnd 
}: LiveStreamViewProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [tips, setTips] = useState(0);
  const [message, setMessage] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [messages, setMessages] = useState<{ user: string; text: string; isTip?: boolean }[]>([
    { user: "System", text: "Welcome to the live stream! 💫" }
  ]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const inviteUrl = `${window.location.origin}/live/${streamId}`;

  useEffect(() => {
    if (isCreator) {
      startCamera();
    } else {
      setViewers(Math.floor(Math.random() * 100) + 50);
      const interval = setInterval(() => {
        setViewers(prev => prev + Math.floor(Math.random() * 5));
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isCreator]);

  const startCamera = async () => {
    setIsStarting(true);
    setError(null);
    
    const support = await mediaService.checkDeviceSupport();
    if (!support.camera) {
      setError("No camera detected. Please connect a camera to go live.");
      setIsStarting(false);
      return;
    }
    
    const stream = await mediaService.startStream(true, true);
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      setIsStarting(false);
      
      setViewers(5);
      const interval = setInterval(() => {
        setViewers(prev => prev + Math.floor(Math.random() * 10) + 1);
      }, 15000);
      return () => clearInterval(interval);
    } else {
      setError("Failed to start camera stream. Please check your device.");
      setIsStarting(false);
    }
  };

  const handleToggleVideo = async () => {
    const newState = !isVideoOff;
    await mediaService.toggleVideo(newState);
    setIsVideoOff(newState);
  };

  const handleToggleAudio = async () => {
    const newState = !isMuted;
    await mediaService.toggleAudio(newState);
    setIsMuted(newState);
  };

  const handleSwitchCamera = async () => {
    await mediaService.switchCamera();
  };

  const sendMessage = () => {
    if (message.trim()) {
      setMessages([...messages, { user: "You", text: message }]);
      setMessage("");
    }
  };

  const sendTip = (amount: number) => {
    setTips(prev => prev + amount);
    setMessages([...messages, { user: "You", text: `🎁 Sent ${amount} SOL!`, isTip: true }]);
    alert(`🎁 You sent ${amount} SOL to ${creatorName || "the creator"}!`);
  };

  const shareStream = async () => {
    if (navigator.share) {
      await navigator.share({
        title: streamTitle || "Live on Sochal",
        text: `Join ${creatorName || "my"} live stream on Sochal!`,
        url: inviteUrl,
      });
    } else {
      setShowInviteModal(true);
    }
  };

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    return () => {
      if (isCreator) {
        mediaService.stopStream();
      }
    };
  }, [isCreator]);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <div className="size-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="size-10 text-red-400" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Camera Access Error</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <Button onClick={onEnd} className="bg-blue-600">Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative h-full w-full bg-black">
        {isCreator ? (
          <video ref={videoRef} autoPlay playsInline muted={isMuted} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="size-32 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Mic className="size-16 text-blue-400" />
              </div>
              <p className="text-white text-xl font-semibold">{creatorName || "Creator"}</p>
              <p className="text-gray-400 text-sm mt-1">{creatorHandle || "@creator"}</p>
              <p className="text-gray-500 text-sm mt-4">is live!</p>
            </div>
          </div>
        )}

        {isStarting && isCreator && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
            <div className="text-center">
              <div className="size-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white">Starting camera...</p>
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
                <span className="text-white text-sm">{viewers}</span>
              </div>
              <div className="flex items-center gap-1 bg-yellow-500/20 rounded-full px-3 py-1">
                <span className="text-yellow-400 text-xs">🏆</span>
                <span className="text-yellow-400 text-sm font-medium">{tips.toFixed(1)} SOL</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={shareStream} className="size-8 rounded-full bg-black/50 flex items-center justify-center">
                <Share2 className="size-4 text-white" />
              </button>
              {isCreator && (
                <>
                  <button onClick={() => setShowInviteModal(true)} className="size-8 rounded-full bg-black/50 flex items-center justify-center">
                    <UserPlus className="size-4 text-white" />
                  </button>
                  <button onClick={onEnd} className="px-3 py-1 rounded-full bg-red-500 text-white text-sm font-medium">
                    End
                  </button>
                </>
              )}
              <button onClick={() => window.history.back()} className="size-8 rounded-full bg-black/50 flex items-center justify-center">
                <X className="size-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Creator Controls */}
        {isCreator && !isStarting && (
          <div className="absolute bottom-24 left-0 right-0 p-4 z-10">
            <div className="flex justify-center gap-4">
              <button onClick={handleToggleAudio} className="size-12 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
                {isMuted ? <MicOff className="size-6 text-white" /> : <Mic className="size-6 text-white" />}
              </button>
              <button onClick={handleToggleVideo} className="size-12 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
                {isVideoOff ? <VideoOff className="size-6 text-white" /> : <Video className="size-6 text-white" />}
              </button>
              <button onClick={handleSwitchCamera} className="size-12 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
                <FlipHorizontal className="size-6 text-white" />
              </button>
            </div>
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
                <div key={i} className={`text-sm ${msg.isTip ? 'bg-yellow-500/20 rounded-lg p-2' : ''}`}>
                  <span className="text-blue-400 font-semibold">{msg.user}: </span>
                  <span className="text-white">{msg.text}</span>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-800">
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                {[0.1, 0.5, 1, 5, 10].map(amount => (
                  <button key={amount} onClick={() => sendTip(amount)} className="px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                    🎁 {amount} SOL
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Say something..." className="flex-1 bg-gray-800 border-gray-700 text-white text-sm" onKeyPress={(e) => e.key === "Enter" && sendMessage()} />
                <Button onClick={sendMessage} size="sm" className="bg-blue-600">
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {!showChat && (
          <button onClick={() => setShowChat(true)} className="fixed right-4 top-24 size-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg z-10">
            <MessageCircle className="size-5 text-white" />
          </button>
        )}

        {showInviteModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setShowInviteModal(false)}>
            <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-white font-bold text-lg mb-2">Invite Friends</h3>
              <p className="text-gray-400 text-sm mb-4">Share this link to invite viewers</p>
              <div className="flex gap-2 mb-6">
                <Input value={inviteUrl} readOnly className="bg-gray-800 border-gray-700 text-white text-sm flex-1" />
                <Button onClick={copyInviteLink} className="bg-blue-600">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <Button variant="outline" onClick={() => setShowInviteModal(false)} className="w-full">Close</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}