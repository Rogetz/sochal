import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

import { TopicTag } from "@/types/sochal.types";

import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  FlipHorizontal,
  StopCircle,
  AlertCircle,
  Camera,
  Music,
  Sparkles,
  Filter,
  Smile,
  Check,
  X,
  ArrowLeft,
} from "lucide-react";

import { addUserReel } from "@/lib/mock-data";
import { useSochal } from "@/lib/sochal-store";

export interface CreatedReelData {
  videoFile: File;
  thumbnail: string;
  description: string;
  topic: TopicTag;
  likes: number;
  comments: number;
  tips: number;
  views: number;
  createdAt: number;
  isLive: boolean;
  music: string | null;
}

interface CreateReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReelCreated: (reelData: CreatedReelData) => void;
}

const TOPICS = [
  {
    value: TopicTag.Singing,
    label: "🎤 Singing",
    color: "bg-purple-500",
  },
  {
    value: TopicTag.Dancing,
    label: "💃 Dancing",
    color: "bg-pink-500",
  },
  {
    value: TopicTag.Comedy,
    label: "😂 Comedy",
    color: "bg-yellow-500",
  },
  {
    value: TopicTag.Rap,
    label: "🎙️ Rap",
    color: "bg-green-500",
  },
  {
    value: TopicTag.Gaming,
    label: "🎮 Gaming",
    color: "bg-blue-500",
  },
];

export function CreateReelModal({
  isOpen,
  onClose,
  onReelCreated,
}: CreateReelModalProps) {
  const { wallet, profile } = useSochal();

  const [step, setStep] = useState<
    "permissions" | "recording" | "preview"
  >("permissions");

  const [isRecording, setIsRecording] = useState(false);

  const [recordTime, setRecordTime] = useState(0);

  const [isMuted, setIsMuted] = useState(false);

  const [isVideoOff, setIsVideoOff] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [description, setDescription] = useState("");

  const [selectedTopic, setSelectedTopic] =
    useState<TopicTag>(TopicTag.Singing);

  const [error, setError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [showMusicPanel, setShowMusicPanel] =
    useState(false);

  const [selectedMusic, setSelectedMusic] =
    useState<string | null>(null);

  const [isPosting, setIsPosting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(
    null
  );

  const recordedChunksRef = useRef<Blob[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const musicLibrary = [
    {
      id: "1",
      name: "Original Sound",
      duration: "0:15",
      icon: "🎵",
    },
    {
      id: "2",
      name: "Trending Beat",
      duration: "0:30",
      icon: "🔥",
    },
    {
      id: "3",
      name: "Dance Mix",
      duration: "0:45",
      icon: "💃",
    },
    {
      id: "4",
      name: "Rap Flow",
      duration: "1:00",
      icon: "🎙️",
    },
  ];

  useEffect(() => {
    if (
      step === "recording" &&
      videoRef.current &&
      streamRef.current
    ) {
      videoRef.current.srcObject = streamRef.current;

      videoRef.current
        .play()
        .catch((err) => console.error(err));
    }
  }, [step]);

  const requestPermissions = async () => {
    setError(null);

    setIsLoading(true);

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1080 },
            height: { ideal: 1920 },
          },
          audio: true,
        });

      streamRef.current = stream;

      setStep("recording");
    } catch (err: unknown) {
      console.error(err);

      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError(
          "Please allow camera and microphone permissions."
        );
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to access camera."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) {
      setError("No camera stream found.");
      return;
    }

    recordedChunksRef.current = [];

    try {
      const mediaRecorder = new MediaRecorder(
        streamRef.current,
        {
          mimeType: "video/webm",
        }
      );

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(
          recordedChunksRef.current,
          {
            type: "video/webm",
          }
        );

        const videoUrl =
          URL.createObjectURL(blob);

        setPreviewUrl(videoUrl);

        setStep("preview");

        setIsRecording(false);

        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      mediaRecorder.start(1000);

      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordTime((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }

          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);

      setError("Failed to start recording.");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
  };

  const toggleAudio = () => {
    if (!streamRef.current) return;

    const audioTrack =
      streamRef.current.getAudioTracks()[0];

    if (audioTrack) {
      audioTrack.enabled = isMuted;

      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (!streamRef.current) return;

    const videoTrack =
      streamRef.current.getVideoTracks()[0];

    if (videoTrack) {
      videoTrack.enabled = isVideoOff;

      setIsVideoOff(!isVideoOff);
    }
  };

  const switchCamera = async () => {
    if (!streamRef.current) return;

    try {
      const currentTrack =
        streamRef.current.getVideoTracks()[0];

      const currentFacingMode =
        currentTrack.getSettings().facingMode;

      const newFacingMode =
        currentFacingMode === "user"
          ? "environment"
          : "user";

      const newStream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: newFacingMode,
          },
          audio: true,
        });

      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = newStream;

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error(err);

      setError("Failed to switch camera.");
    }
  };

  const generateThumbnail = (
    videoUrl: string
  ): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");

      video.src = videoUrl;

      video.currentTime = 1;

      video.onloadeddata = () => {
        const canvas =
          document.createElement("canvas");

        canvas.width = 400;

        canvas.height = 700;

        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.drawImage(video, 0, 0, 400, 700);

          resolve(
            canvas.toDataURL("image/jpeg")
          );
        }
      };
    });
  };

  const submitReel = async () => {
    if (!previewUrl) return;

    setIsPosting(true);

    try {
      const thumbnail =
        await generateThumbnail(previewUrl);

      const videoFile = new File(
        [new Blob(recordedChunksRef.current, { type: "video/webm" })],
        "reel.webm",
        { type: "video/webm" }
      );

      const reel = {
        id: crypto.randomUUID(),

        creatorId:
          wallet?.address || "guest-user",

        creatorName:
          profile?.displayName || "Unknown",

        creatorHandle:
          profile?.handle || "creator",

        creatorAvatar:
          "https://randomuser.me/api/portraits/lego/1.jpg",

        videoUrl: previewUrl,

        thumbnailUrl: thumbnail,

        description,

        topic: selectedTopic,

        likes: 0,

        comments: 0,

        tips: 0,

        views: 0,

        createdAt: Date.now(),

        isLive: false,

        music: selectedMusic,
      };

      const reelData: CreatedReelData = {
        videoFile,
        thumbnail,
        description,
        topic: selectedTopic,
        likes: 0,
        comments: 0,
        tips: 0,
        views: 0,
        createdAt: Date.now(),
        isLive: false,
        music: selectedMusic,
      };

      try {
        addUserReel(reel);
      } catch (e) {
        console.log(e);
      }

      onReelCreated(reelData);

      cleanup();

      onClose();
    } catch (err) {
      console.error(err);

      setError("Failed to post reel.");
    } finally {
      setIsPosting(false);
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setPreviewUrl(null);

    setStep("permissions");

    setDescription("");

    setRecordTime(0);

    setError(null);

    setIsRecording(false);

    setIsMuted(false);

    setIsVideoOff(false);

    setSelectedMusic(null);

    setShowMusicPanel(false);
  };

  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);

    const secs = seconds % 60;

    return `${mins
      .toString()
      .padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 border-none bg-black w-[380px] h-[90vh] overflow-hidden rounded-3xl">
        <div className="relative w-full h-full bg-black">
          {error && (
            <div className="absolute top-16 left-4 right-4 z-50 p-3 rounded-xl bg-red-500/20 border border-red-500 text-red-300 text-sm flex items-center gap-2">
              <AlertCircle className="size-4" />
              {error}
            </div>
          )}

          {step === "permissions" && (
            <div className="flex flex-col items-center justify-center h-full px-8 text-center">
              <div className="size-24 rounded-full bg-blue-500/20 flex items-center justify-center mb-6">
                <Camera className="size-12 text-blue-400" />
              </div>

              <h2 className="text-white text-2xl font-bold mb-3">
                Create Reel
              </h2>

              <p className="text-gray-400 mb-8">
                Allow camera and microphone access
                to create reels.
              </p>

              <Button
                onClick={requestPermissions}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 h-12 px-8 rounded-full"
              >
                {isLoading
                  ? "Requesting..."
                  : "Allow Access"}
              </Button>
            </div>
          )}

          {step === "recording" && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />

              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700">
                <div
                  className="h-full bg-red-500"
                  style={{
                    width: `${
                      (recordTime / 60) * 100
                    }%`,
                  }}
                />
              </div>

              <div className="absolute top-5 left-4 right-4 flex items-center justify-between z-30">
                <button
                  onClick={onClose}
                  className="size-10 rounded-full bg-black/50 flex items-center justify-center"
                >
                  <ArrowLeft className="size-5 text-white" />
                </button>

                <div className="bg-black/60 px-3 py-1 rounded-full text-white text-sm">
                  {formatTime(recordTime)}
                </div>
              </div>

              {showMusicPanel && (
                <div className="absolute bottom-24 left-0 right-0 bg-black/90 backdrop-blur-xl rounded-t-3xl p-4 z-40">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold">
                      Add Music
                    </h3>

                    <button
                      onClick={() =>
                        setShowMusicPanel(false)
                      }
                    >
                      <X className="size-5 text-white" />
                    </button>
                  </div>

                  <div className="space-y-3 max-h-52 overflow-y-auto">
                    {musicLibrary.map((music) => (
                      <button
                        key={music.id}
                        onClick={() => {
                          setSelectedMusic(
                            music.name
                          );

                          setShowMusicPanel(false);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl transition ${
                          selectedMusic === music.name
                            ? "bg-blue-500/20 border border-blue-500"
                            : "bg-gray-900"
                        }`}
                      >
                        <div className="size-12 rounded-full bg-gray-800 flex items-center justify-center text-xl">
                          {music.icon}
                        </div>

                        <div className="flex-1 text-left">
                          <p className="text-white text-sm font-medium">
                            {music.name}
                          </p>

                          <p className="text-gray-400 text-xs">
                            {music.duration}
                          </p>
                        </div>

                        {selectedMusic ===
                          music.name && (
                          <Check className="size-5 text-blue-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="absolute right-4 bottom-32 flex flex-col gap-4 z-30">
                <button
                  onClick={toggleAudio}
                  className="size-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
                >
                  {isMuted ? (
                    <MicOff className="size-5 text-white" />
                  ) : (
                    <Mic className="size-5 text-white" />
                  )}
                </button>

                <button
                  onClick={toggleVideo}
                  className="size-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
                >
                  {isVideoOff ? (
                    <VideoOff className="size-5 text-white" />
                  ) : (
                    <Video className="size-5 text-white" />
                  )}
                </button>

                <button
                  onClick={switchCamera}
                  className="size-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
                >
                  <FlipHorizontal className="size-5 text-white" />
                </button>

                <button
                  onClick={() =>
                    setShowMusicPanel(true)
                  }
                  className="size-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
                >
                  <Music className="size-5 text-white" />
                </button>

                <button className="size-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                  <Filter className="size-5 text-white" />
                </button>

                <button className="size-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                  <Smile className="size-5 text-white" />
                </button>

                <button className="size-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                  <Sparkles className="size-5 text-white" />
                </button>
              </div>

              <div className="absolute bottom-8 left-0 right-0 flex justify-center z-30">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="size-20 rounded-full bg-red-500 border-4 border-white/30 flex items-center justify-center animate-pulse"
                  >
                    <div className="size-8 bg-white rounded-full" />
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="size-20 rounded-full bg-gray-700 border-4 border-white/30 flex items-center justify-center"
                  >
                    <StopCircle className="size-10 text-white" />
                  </button>
                )}
              </div>
            </>
          )}

          {step === "preview" &&
            previewUrl && (
              <div className="flex flex-col h-full bg-black">
                <div className="relative flex-1">
                  <video
                    src={previewUrl}
                    controls
                    className="w-full h-full object-cover"
                  />

                  <button
                    onClick={() =>
                      setStep("recording")
                    }
                    className="absolute top-4 left-4 size-10 rounded-full bg-black/60 flex items-center justify-center"
                  >
                    <ArrowLeft className="size-5 text-white" />
                  </button>
                </div>

                <div className="p-4 bg-black border-t border-gray-800 space-y-4">
                  <Textarea
                    placeholder="Write a caption..."
                    value={description}
                    onChange={(e) =>
                      setDescription(
                        e.target.value
                      )
                    }
                    maxLength={150}
                    className="bg-gray-900 border-gray-700 text-white resize-none"
                    rows={3}
                  />

                  <div className="flex flex-wrap gap-2">
                    {TOPICS.map((topic) => (
                      <button
                        key={topic.value}
                        onClick={() =>
                          setSelectedTopic(
                            topic.value
                          )
                        }
                        className={`px-3 py-1 rounded-full text-xs text-white transition ${
                          selectedTopic ===
                          topic.value
                            ? topic.color
                            : "bg-gray-800"
                        }`}
                      >
                        {topic.label}
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={submitReel}
                    disabled={isPosting}
                    className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isPosting
                      ? "Posting..."
                      : "Post Reel"}
                  </Button>
                </div>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}