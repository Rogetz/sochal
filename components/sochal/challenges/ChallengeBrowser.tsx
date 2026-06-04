import { useState } from "react";
import { TopicTag, type MockChallenge } from "@/types/sochal.types";
import { ChallengeCard } from "./ChallengeCard";
import { ChallengeTagFilter } from "./ChallengeTagFilter";

// MOCK DATA - Challenges that exist on the platform
const MOCK_CHALLENGES: MockChallenge[] = [
  {
    id: "ch_1",
    topic: TopicTag.Singing,
    title: "Vocal Showdown",
    description: "Best vocal performance wins. Original songs only.",
    creatorCount: 8,
    totalPrizePool: 12.5,
    thumbnailUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745",
    activeLives: [
      {
        liveId: "live_1",
        creatorName: "Sarah Soul",
        creatorHandle: "@sarahsoul",
        creatorAvatar: "https://i.pravatar.cc/150?img=1",
        currentTips: 2.3,
        viewerCount: 234,
        isActive: true,
      },
    ],
    createdAt: new Date(),
    endsAt: new Date(Date.now() + 86400000),
  },
  {
    id: "ch_2",
    topic: TopicTag.Dancing,
    title: "Street Dance Battle",
    description: "Hip-hop, breaking, and freestyle. 1 min max.",
    creatorCount: 12,
    totalPrizePool: 25.0,
    thumbnailUrl: "https://images.unsplash.com/photo-1518834107812-67b0b7c58434",
    activeLives: [
      {
        liveId: "live_2",
        creatorName: "B-Boy Jay",
        creatorHandle: "@bboyjay",
        creatorAvatar: "https://i.pravatar.cc/150?img=3",
        currentTips: 5.1,
        viewerCount: 567,
        isActive: true,
      },
    ],
    createdAt: new Date(),
    endsAt: new Date(Date.now() + 172800000),
  },
  {
    id: "ch_3",
    topic: TopicTag.Comedy,
    title: "Laugh Off",
    description: "Stand-up, improv, or sketch. Make us laugh!",
    creatorCount: 6,
    totalPrizePool: 8.2,
    thumbnailUrl: "https://images.unsplash.com/photo-1527224857830-43a7acc85260",
    activeLives: [],
    createdAt: new Date(),
    endsAt: new Date(Date.now() + 3600000),
  },
];

interface ChallengeBrowserProps {
  onJoinLive: (challengeId: string, liveId: string) => void;
}

export function ChallengeBrowser({ onJoinLive }: ChallengeBrowserProps) {
  const [selectedTopic, setSelectedTopic] = useState<TopicTag | "all">("all");

  const filteredChallenges = MOCK_CHALLENGES.filter(
    (c) => selectedTopic === "all" || c.topic === selectedTopic
  );

  return (
    <div className="min-h-screen bg-black py-6 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">🔥 Live Challenges</h1>
          <p className="text-gray-400 text-sm mt-1">Pick a challenge, join a live battle</p>
        </div>

        {/* Tag Filter - Like TikTok #tags */}
        <ChallengeTagFilter selectedTopic={selectedTopic} onSelectTopic={setSelectedTopic} />

        {/* Challenges List */}
        <div className="space-y-4">
          {filteredChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onJoinLive={onJoinLive}
            />
          ))}
        </div>

        {filteredChallenges.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No challenges with this tag yet</p>
          </div>
        )}
      </div>
    </div>
  );
}