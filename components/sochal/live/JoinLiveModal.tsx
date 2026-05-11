import { useState } from "react";
import { TopicTag, type MockChallenge } from "@/types/sochal.types";

interface JoinLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenges: MockChallenge[];
  onJoin: (challengeId: string, liveId: string) => void;
}

export function JoinLiveModal({ isOpen, onClose, challenges, onJoin }: JoinLiveModalProps) {
  const [selectedTopic, setSelectedTopic] = useState<TopicTag | "all">("all");

  if (!isOpen) return null;

  const filteredChallenges = challenges.filter(
    (c) => selectedTopic === "all" || c.topic === selectedTopic
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-blue-500/30 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-900/95 pb-4">
          <h2 className="text-2xl font-bold text-white">Join a Live Battle</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedTopic("all")}
            className={`px-3 py-1.5 rounded-full text-sm ${
              selectedTopic === "all" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
            }`}
          >
            🔥 All
          </button>
          {Object.values(TopicTag).map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTopic(tag)}
              className={`px-3 py-1.5 rounded-full text-sm ${
                selectedTopic === tag ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredChallenges.map((challenge) => (
            <div key={challenge.id} className="border border-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-white font-semibold">{challenge.title}</h3>
                  <p className="text-gray-500 text-sm">#{challenge.topic}</p>
                </div>
                <span className="text-yellow-400 text-sm">🏆 {challenge.totalPrizePool} SOL</span>
              </div>

              {challenge.activeLives.length > 0 ? (
                <div className="space-y-2">
                  {challenge.activeLives.map((live) => (
                    <button
                      key={live.liveId}
                      onClick={() => onJoin(challenge.id, live.liveId)}
                      className="w-full flex items-center justify-between bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white">{live.creatorName}</span>
                      </div>
                      <div className="flex gap-3 text-sm">
                        <span className="text-green-400">{live.currentTips} SOL</span>
                        <span className="text-gray-500">👁️ {live.viewerCount}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-2">No active lives yet</p>
              )}
            </div>
          ))}
        </div>

        {filteredChallenges.length === 0 && (
          <p className="text-center text-gray-500 py-8">No challenges in this category</p>
        )}
      </div>
    </div>
  );
}