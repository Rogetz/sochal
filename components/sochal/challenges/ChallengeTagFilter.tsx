import { TopicTag } from "@/types/sochal.types";

const TOPICS = [
  { tag: "all", label: "All", icon: "🔥" },
  { tag: TopicTag.Singing, label: "Singing", icon: "🎤" },
  { tag: TopicTag.Dancing, label: "Dancing", icon: "💃" },
  { tag: TopicTag.Comedy, label: "Comedy", icon: "😂" },
  { tag: TopicTag.Rap, label: "Rap", icon: "🎙️" },
  { tag: TopicTag.Beatbox, label: "Beatbox", icon: "🎵" },
  { tag: TopicTag.Gaming, label: "Gaming", icon: "🎮" },
  { tag: TopicTag.Magic, label: "Magic", icon: "🪄" },
];

interface ChallengeTagFilterProps {
  selectedTopic: TopicTag | "all";
  onSelectTopic: (topic: TopicTag | "all") => void;
}

export function ChallengeTagFilter({
  selectedTopic,
  onSelectTopic,
}: ChallengeTagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-blue-500/20">
      {TOPICS.map((topic) => (
        <button
          key={topic.tag}
          onClick={() => onSelectTopic(topic.tag as TopicTag | "all")}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
            transition-all duration-200
            ${
              selectedTopic === topic.tag
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                : "bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-700"
            }
          `}
        >
          <span>{topic.icon}</span>
          <span>{topic.label}</span>
        </button>
      ))}
    </div>
  );
}