"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Radio, Users, Plus } from "lucide-react";

// Use the same Topic type as your store
type Topic = "Singing" | "Dancing" | "Comedy" | "Rap" | "Gaming" | "Cooking";

const TOPICS = [
  { value: "Singing" as Topic, label: "🎤 Singing" },
  { value: "Dancing" as Topic, label: "💃 Dancing" },
  { value: "Comedy" as Topic, label: "😂 Comedy" },
  { value: "Rap" as Topic, label: "🎙️ Rap" },
  { value: "Gaming" as Topic, label: "🎮 Gaming" },
];

interface GoLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChallenge: (topic: Topic, title: string, description: string, targetMin: number) => void;
  onJoinExisting: () => void;
}

export function GoLiveModal({ isOpen, onClose, onCreateChallenge, onJoinExisting }: GoLiveModalProps) {
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [selectedTopic, setSelectedTopic] = useState<Topic>("Singing");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetMin, setTargetMin] = useState(10);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!title.trim()) return;
    onCreateChallenge(selectedTopic, title, description, targetMin);
    setMode("select");
    setTitle("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-gray-900 to-black border border-blue-500/30 max-w-md">
        {mode === "select" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">Go Live</DialogTitle>
              <DialogDescription className="text-gray-400">
                First, create a challenge or join an existing one before going live.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              <button
                onClick={() => setMode("create")}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all group"
              >
                <div className="size-12 rounded-full bg-blue-600/20 flex items-center justify-center group-hover:scale-110 transition">
                  <Plus className="size-6 text-blue-400" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">Create New Challenge</div>
                  <div className="text-xs text-gray-400">Start your own battle with a topic tag</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setMode("join");
                  onJoinExisting();
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-700 bg-gray-800/50 hover:bg-gray-800 transition-all group"
              >
                <div className="size-12 rounded-full bg-gray-700/50 flex items-center justify-center group-hover:scale-110 transition">
                  <Users className="size-6 text-gray-400" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">Join Existing Challenge</div>
                  <div className="text-xs text-gray-400">Battle in an ongoing challenge</div>
                </div>
              </button>
            </div>
          </>
        )}

        {mode === "create" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">Create Challenge</DialogTitle>
              <DialogDescription className="text-gray-400">
                Set up your battle. Choose a topic tag and describe your challenge.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-gray-300">Topic Tag</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {TOPICS.map((topic) => (
                    <button
                      key={topic.value}
                      onClick={() => setSelectedTopic(topic.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedTopic === topic.value
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800/50 text-gray-400 hover:bg-gray-800"
                      }`}
                    >
                      {topic.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-gray-300">Challenge Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Vocal Showdown"
                  className="mt-1 bg-gray-800/50 border-gray-700 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your challenge..."
                  rows={3}
                  className="mt-1 bg-gray-800/50 border-gray-700 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">Target Minimum: {targetMin} SOL</Label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={targetMin}
                  onChange={(e) => setTargetMin(Number(e.target.value))}
                  className="w-full mt-2"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setMode("select")} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleCreate} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Create Challenge →
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}