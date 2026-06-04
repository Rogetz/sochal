"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { 
  Mic, MicOff, Video, VideoOff, X, Send, Users, Gift,
  FlipHorizontal, Share2, Copy, Check,
  MessageCircle, Trophy
} from "lucide-react";
import { mediaService } from "@/lib/media";
import { Battle } from "@/lib/battle-service";
import { TipCelebration } from "@/components/sochal/live/TipCelebration";

interface BattleViewProps {
  battle: Battle;
  currentCreatorWallet: string;
  streamTitle?: string;
  onEnd: () => void;
  onSendTip: (amount: number, creatorWallet: string) => void;
}

export function BattleView({ 
  battle, 
  currentCreatorWallet, 
  onEnd, 
  onSendTip 
}: BattleViewProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [message, setMessage] = useState("");
  const [showChat, setShowChat] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftTarget, setGiftTarget] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tipCelebration, setTipCelebration] = useState<{ amountSol: number; creatorLabel: string } | null>(null);
  const [messages, setMessages] = useState<{ user: string; text: string; isTip?: boolean }[]>([
    { user: "System", text: "🎮 BATTLE STARTED! Tip your favorite creator to help them win!" }
  ]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const isCreatorA = battle.creatorA === currentCreatorWallet;
  const isCreatorB = battle.creatorB === currentCreatorWallet;
  const isCurrentCreator = isCreatorA || isCreatorB;
  
  const myTips = isCreatorA ? battle.tipsA : isCreatorB ? battle.tipsB : 0;
  const opponentTips = isCreatorA ? battle.tipsB : isCreatorB ? battle.tipsA : 0;
  const isViewer = !isCurrentCreator;
  const totalTips = battle.tipsA + battle.tipsB;
  const myPercentage = totalTips > 0 ? (myTips / totalTips) * 100 : 50;
  const opponentPercentage = totalTips > 0 ? (opponentTips / totalTips) * 100 : 50;
  const winner = battle.tipsA > battle.tipsB ? battle.creatorAName : battle.tipsB > battle.tipsA ? (battle.creatorBName || "") : null;
  const isBattleOver = battle.status === "completed" || (battle.targetSol > 0 && battle.currentSol >= battle.targetSol);
  const giftAmounts = [0.1, 0.5, 1, 5, 10, 20];
  
  useEffect(() => {
    const init = async () => {
      if (isCurrentCreator) {
        const stream = await mediaService.startStream(true, true);
        if (stream && videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
      setLoading(false);
    };
    init();
    
    const viewerInterval = setInterval(() => {
      setViewers(prev => prev + Math.floor(Math.random() * 10));
    }, 10000);
    
    return () => {
      clearInterval(viewerInterval);
      if (isCurrentCreator) {
        mediaService.stopStream();
      }
    };
  }, [isCurrentCreator]);

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

  const sendTip = (amount: number, targetCreator: string) => {
    const targetName = targetCreator === battle.creatorA ? battle.creatorAName : (battle.creatorBName || "creator");
    onSendTip(amount, targetCreator);
    setTipCelebration({ amountSol: amount, creatorLabel: targetName });
    setMessages([...messages, { 
      user: "You", 
      text: `🎁 Sent ${amount} SOL to ${targetName}!`, 
      isTip: true 
    }]);
  };

  const openGiftPicker = (targetCreator: string) => {
    setGiftTarget(targetCreator);
    setShowGiftModal(true);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="size-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Starting battle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="flex h-full">
        {/* LEFT - Creator A */}
        <div className="flex-1 relative border-r border-gray-700">
          <div className="absolute top-4 left-4 z-20 bg-black/70 rounded-lg px-3 py-2">
            <p className="text-white font-bold">{battle.creatorAName}</p>
            <p className="text-yellow-400 text-sm">🏆 {battle.tipsA.toFixed(1)} SOL</p>
          </div>
          
          {isCreatorA ? (
            <video ref={videoRef} autoPlay playsInline muted={isMuted} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/50 to-black">
              <Image src={battle.creatorAAvatar || "/images/avatar-fallback.png"} alt="" width={128} height={128} className="rounded-full border-4 border-purple-500 object-cover" unoptimized />
              <p className="text-white mt-4 font-semibold">{battle.creatorAName}</p>
              <p className="text-gray-400 text-sm">@{battle.creatorAHandle}</p>
            </div>
          )}
          
          {isViewer && battle.creatorA && (
            <button
              onClick={() => openGiftPicker(battle.creatorA)}
              className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/45 p-3 backdrop-blur-md transition hover:bg-black/65"
              aria-label={`Gift ${battle.creatorAName}`}
            >
              <Gift className="size-6 text-purple-300" />
            </button>
          )}
        </div>
        
        {/* RIGHT - Creator B */}
        <div className="flex-1 relative">
          <div className="absolute top-4 right-4 z-20 bg-black/70 rounded-lg px-3 py-2 text-right">
            <p className="text-white font-bold">{battle.creatorBName || "Waiting..."}</p>
            <p className="text-yellow-400 text-sm">🏆 {battle.tipsB.toFixed(1)} SOL</p>
          </div>
          
          {isCreatorB ? (
            <video ref={videoRef} autoPlay playsInline muted={isMuted} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-900/50 to-black">
                {battle.creatorBAvatar ? (
                <Image src={battle.creatorBAvatar} alt="" width={128} height={128} className="rounded-full border-4 border-blue-500 object-cover" unoptimized />
              ) : (
                <div className="size-32 rounded-full border-4 border-blue-500 flex items-center justify-center bg-gray-800">
                  <span className="text-4xl">?</span>
                </div>
              )}
              <p className="text-white mt-4 font-semibold">{battle.creatorBName || "Waiting for opponent..."}</p>
              {battle.creatorBHandle && <p className="text-gray-400 text-sm">@{battle.creatorBHandle}</p>}
            </div>
          )}
          
          {isViewer && battle.creatorB && (
            <button
              onClick={() => openGiftPicker(battle.creatorB!)}
              className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/45 p-3 backdrop-blur-md transition hover:bg-black/65"
              aria-label={`Gift ${battle.creatorBName || "Creator"}`}
            >
              <Gift className="size-6 text-sky-300" />
            </button>
          )}
        </div>
      </div>
      
      {/* VS Badge */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
        <div className="size-20 rounded-full bg-red-600 flex items-center justify-center shadow-2xl animate-pulse">
          <span className="text-2xl font-bold text-white">VS</span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="absolute bottom-20 left-0 right-0 z-20">
        <div className="flex h-3">
          <div className="bg-purple-500 transition-all duration-300" style={{ width: `${myPercentage}%` }} />
          <div className="bg-blue-500 transition-all duration-300" style={{ width: `${opponentPercentage}%` }} />
        </div>
      </div>
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="size-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white text-sm font-medium">BATTLE</span>
            </div>
            <div className="flex items-center gap-1 bg-black/50 rounded-full px-3 py-1">
              <Users className="size-3 text-gray-400" />
              <span className="text-white text-sm">{viewers}</span>
            </div>
            <div className="flex items-center gap-1 bg-black/50 rounded-full px-3 py-1">
              <Trophy className="size-3 text-gray-400" />
              <span className="text-white text-sm">
                {battle.currentSol.toFixed(1)} / {battle.targetSol.toFixed(1)} SOL
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInviteModal(true)} className="size-8 rounded-full bg-black/50 flex items-center justify-center">
              <Share2 className="size-4 text-white" />
            </button>
            {isCurrentCreator && (
              <button onClick={onEnd} className="px-3 py-1 rounded-full bg-red-500 text-white text-sm font-medium">
                End Battle
              </button>
            )}
            <button onClick={() => window.history.back()} className="size-8 rounded-full bg-black/50 flex items-center justify-center">
              <X className="size-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {tipCelebration && (
        <TipCelebration
          amountSol={tipCelebration.amountSol}
          creatorLabel={tipCelebration.creatorLabel}
          onFinished={() => setTipCelebration(null)}
        />
      )}
      
      {/* Winner Announcement */}
      {isBattleOver && winner && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="text-center bg-gradient-to-r from-yellow-600 to-yellow-800 rounded-2xl p-8 max-w-md">
            <Trophy className="size-16 text-yellow-300 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Battle Complete!</h2>
            <p className="text-white text-xl">{winner} wins!</p>
            <p className="text-yellow-300 mt-2">🏆 {totalTips.toFixed(1)} SOL Prize Pool</p>
            <Button onClick={onEnd} className="mt-6 bg-white text-black hover:bg-gray-200">
              Close
            </Button>
          </div>
        </div>
      )}
      
      {/* Creator Controls */}
      {isCurrentCreator && !isBattleOver && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-10">
          <div className="flex justify-center gap-4 bg-black/50 rounded-full p-2">
            <button onClick={handleToggleAudio} className="size-10 rounded-full bg-black/60 flex items-center justify-center">
              {isMuted ? <MicOff className="size-5 text-white" /> : <Mic className="size-5 text-white" />}
            </button>
            <button onClick={handleToggleVideo} className="size-10 rounded-full bg-black/60 flex items-center justify-center">
              {isVideoOff ? <VideoOff className="size-5 text-white" /> : <Video className="size-5 text-white" />}
            </button>
            <button onClick={handleSwitchCamera} className="size-10 rounded-full bg-black/60 flex items-center justify-center">
              <FlipHorizontal className="size-5 text-white" />
            </button>
          </div>
        </div>
      )}
      
      {/* Center Chat */}
      {showChat && (
        <div className="absolute left-1/2 top-[calc(50%-11.5rem)] z-40 w-[min(92vw,28rem)] -translate-x-1/2">
          <div className="rounded-3xl border border-white/10 bg-black/18 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.35),0_0_24px_rgba(59,130,246,0.18)] ring-1 ring-cyan-300/10">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-semibold tracking-wide text-white/90">
                Battle Chat
              </h3>
              <button onClick={() => setShowChat(false)} className="text-white/70 hover:text-white">
                ✕
              </button>
            </div>

            <div className="max-h-[18rem] space-y-2 overflow-y-auto px-4 py-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-xl px-3 py-2 text-sm ${msg.isTip ? "bg-white/8" : "bg-black/10"}`}
                >
                  <span className="font-semibold text-pink-200">{msg.user}: </span>
                  <span className="text-white/90">{msg.text}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 p-3">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Say something..."
                  className="flex-1 border-white/10 bg-black/25 text-white placeholder:text-white/40"
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button onClick={sendMessage} size="sm" className="bg-white/12 text-white hover:bg-white/20">
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showChat && (
        <button onClick={() => setShowChat(true)} className="fixed right-4 top-24 size-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg z-10">
          <MessageCircle className="size-5 text-white" />
        </button>
      )}

      {showGiftModal && giftTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setShowGiftModal(false)}>
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950/95 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-pink-300/80">Gift in battle</p>
                <h3 className="mt-1 text-lg font-semibold text-white">
                  Support {giftTarget === battle.creatorA ? battle.creatorAName : (battle.creatorBName || "creator")}
                </h3>
              </div>
              <button onClick={() => setShowGiftModal(false)} className="text-white/70 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {giftAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => {
                    sendTip(amount, giftTarget);
                    setShowGiftModal(false);
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {amount} SOL
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setShowInviteModal(false)}>
          <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-2">Share Battle</h3>
            <p className="text-gray-400 text-sm mb-4">Invite friends to watch this battle!</p>
            <div className="flex gap-2 mb-6">
              <Input value={window.location.href} readOnly className="bg-gray-800 border-gray-700 text-white text-sm flex-1" />
              <Button onClick={async () => {
                await navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }} className="bg-blue-600">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <Button variant="outline" onClick={() => setShowInviteModal(false)} className="w-full">Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}