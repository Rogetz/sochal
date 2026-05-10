import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TopicTag } from "@/types/sochal.types";
import { Video, Mic, MicOff, VideoOff, FlipHorizontal, X, StopCircle, AlertCircle, Camera } from "lucide-react";

interface CreateReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReelCreated: (reelData: any) => void;
}

const TOPICS = [
  { value: TopicTag.Singing, label: "🎤 Singing" },
  { value: TopicTag.Dancing, label: "💃 Dancing" },
  { value: TopicTag.Comedy, label: "😂 Comedy" },
  { value: TopicTag.Rap, label: "🎙️ Rap" },
  { value: TopicTag.Gaming, label: "🎮 Gaming" },
];

export function CreateReelModal({ isOpen, onClose, onReelCreated }: CreateReelModalProps) {
  const [step, setStep] = useState<"permissions" | "recording" | "preview">("permissions");
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<TopicTag>(TopicTag.Singing);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Request camera permissions - DIRECT APPROACH
  const requestPermissions = async () => {
    console.log("=== REQUESTING PERMISSIONS ===");
    setError(null);
    setIsLoading(true);
    
    try {
      // Try to get camera with explicit constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: true 
      });
      
      console.log("Got stream successfully!");
      console.log("Tracks:", stream.getTracks());
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setHasPermission(true);
        setStep("recording");
        console.log("Video element updated, step changed to recording");
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      console.error("Error name:", err.name);
      console.error("Error message:", err.message);
      
      if (err.name === "NotAllowedError") {
        setError("Camera access denied. Please click the camera icon in your browser address bar and allow access, then refresh.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found on this device. Please connect a camera.");
      } else {
        setError(`Camera error: ${err.message}. Please check your camera and try again.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Start recording
  const startRecording = () => {
    console.log("Start recording clicked");
    if (!streamRef.current) {
      setError("No camera stream. Please request permissions first.");
      return;
    }
    
    recordedChunksRef.current = [];
    
    try {
      const mediaRecorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setStep("preview");
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordTime(0);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordTime(prev => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (err) {
      console.error("Recording error:", err);
      setError("Failed to start recording. Please try again.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !isVideoOff;
      setIsVideoOff(!isVideoOff);
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (!streamRef.current) return;
    const audioTrack = streamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Submit reel
  const submitReel = async () => {
    if (!previewUrl) return;
    
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const file = new File([blob], `reel_${Date.now()}.webm`, { type: 'video/webm' });
      
      onReelCreated({
        videoFile: file,
        description,
        topic: selectedTopic,
        thumbnail: "",
      });
      
      cleanup();
      onClose();
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to save reel. Please try again.");
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setStep("permissions");
    setDescription("");
    setRecordTime(0);
    setError(null);
    setIsRecording(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-gray-800 max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Camera className="size-5 text-blue-400" />
            Create Reel
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === "permissions" && (
            <div className="text-center py-8">
              <div className="size-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Video className="size-10 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Camera & Microphone Access</h3>
              <p className="text-gray-400 text-sm mb-6">
                Sochal needs access to your camera and microphone to record reels
              </p>
              <Button 
                onClick={requestPermissions} 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? "Requesting..." : "Allow Access"}
              </Button>
              <p className="text-gray-500 text-xs mt-4">
                If nothing happens, check your browser's camera permissions in the address bar
              </p>
            </div>
          )}

          {step === "recording" && (
            <div>
              <div className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden mb-4 border border-gray-800">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                
                {/* Recording Indicator */}
                <div className="absolute top-4 left-4 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <span className="size-1.5 bg-white rounded-full animate-pulse" />
                  REC {formatTime(recordTime)}
                </div>
                
                {/* Recording Controls */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                  <button 
                    onClick={toggleAudio} 
                    className="size-12 rounded-full bg-black/60 backdrop-blur flex items-center justify-center"
                  >
                    {isMuted ? <MicOff className="size-6 text-white" /> : <Mic className="size-6 text-white" />}
                  </button>
                  
                  <button 
                    onClick={toggleVideo} 
                    className="size-12 rounded-full bg-black/60 backdrop-blur flex items-center justify-center"
                  >
                    {isVideoOff ? <VideoOff className="size-6 text-white" /> : <Video className="size-6 text-white" />}
                  </button>
                  
                  {!isRecording ? (
                    <button 
                      onClick={startRecording} 
                      className="size-16 rounded-full bg-red-500 flex items-center justify-center animate-pulse"
                    >
                      <div className="size-5 bg-white rounded-full" />
                    </button>
                  ) : (
                    <button 
                      onClick={stopRecording} 
                      className="size-16 rounded-full bg-gray-700 flex items-center justify-center"
                    >
                      <StopCircle className="size-8 text-white" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-center text-gray-400 text-sm">Tap the red button to start recording (max 60 seconds)</p>
            </div>
          )}

          {step === "preview" && previewUrl && (
            <div>
              <video src={previewUrl} controls className="w-full rounded-xl mb-4 max-h-[400px]" />
              <div className="space-y-3">
                <Textarea
                  placeholder="Write a caption..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={3}
                  maxLength={150}
                />
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value as TopicTag)}
                  className="w-full bg-gray-800 border-gray-700 text-white rounded-lg px-3 py-2"
                >
                  {TOPICS.map(topic => (
                    <option key={topic.value} value={topic.value}>{topic.label}</option>
                  ))}
                </select>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("recording")} className="flex-1">
                    Re-record
                  </Button>
                  <Button onClick={submitReel} className="flex-1 bg-blue-600">
                    Post Reel →
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}