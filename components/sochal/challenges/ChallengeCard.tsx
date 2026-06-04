import { type MockChallenge } from "@/types/sochal.types";

interface ChallengeCardProps {
  challenge: MockChallenge;
  onJoinLive: (challengeId: string, liveId: string) => void;
}

export function ChallengeCard({ challenge, onJoinLive }: ChallengeCardProps) {
  const timeLeft = Math.max(0, challenge.endsAt.getTime() - Date.now());
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black border border-blue-500/20 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300">
      <div
        className="relative h-48 bg-cover bg-center"
        style={{ backgroundImage: `url(${challenge.thumbnailUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex justify-between items-center">
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              {challenge.topic}
            </span>
            <span className="bg-black/70 text-white text-xs px-2 py-1 rounded-full">
              {hoursLeft}h left
            </span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-xl font-bold text-white mb-1">{challenge.title}</h3>
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{challenge.description}</p>

        <div className="flex justify-between items-center mb-4 text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-400">👥 {challenge.creatorCount} creators</span>
            <span className="text-yellow-400">🏆 {challenge.totalPrizePool} SOL</span>
          </div>
        </div>

        {challenge.activeLives.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">🔴 LIVE NOW</p>
            {challenge.activeLives.map((live) => (
              <button
                key={live.liveId}
                onClick={() => onJoinLive(challenge.id, live.liveId)}
                className="w-full flex items-center justify-between bg-gray-800/50 rounded-xl p-3 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={live.creatorAvatar}
                    alt={live.creatorName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="text-left">
                    <p className="text-white font-medium text-sm">{live.creatorName}</p>
                    <p className="text-gray-500 text-xs">{live.creatorHandle}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-400 text-sm">{live.currentTips} SOL tipped</p>
                  <p className="text-gray-500 text-xs">👁️ {live.viewerCount}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {challenge.activeLives.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            No active lives yet. Be the first to go live!
          </div>
        )}
      </div>
    </div>
  );
}