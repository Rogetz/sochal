import type { Topic } from "@/lib/sochal-store";

const styles: Record<Topic, string> = {
  Singing: "from-[oklch(0.6_0.22_320)] to-[oklch(0.5_0.22_290)]",
  Dancing: "from-[oklch(0.65_0.22_30)] to-[oklch(0.55_0.22_15)]",
  Comedy: "from-[oklch(0.7_0.18_85)] to-[oklch(0.6_0.18_55)]",
  Rap: "from-[oklch(0.55_0.22_265)] to-[oklch(0.45_0.22_280)]",
  Gaming: "from-[oklch(0.6_0.2_145)] to-[oklch(0.5_0.2_165)]",
  Cooking: "from-[oklch(0.65_0.2_50)] to-[oklch(0.55_0.2_25)]",
};

export function TopicBadge({ topic, size = "sm" }: { topic: Topic; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${styles[topic]} font-medium text-white shadow-sm ${
        size === "md" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-[10px]"
      }`}
    >
      <span className="size-1.5 rounded-full bg-white/90" />
      {topic}
    </span>
  );
}
