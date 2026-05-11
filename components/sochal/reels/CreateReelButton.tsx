import { Plus } from "lucide-react";

interface CreateReelButtonProps {
  onClick: () => void;
}

export function CreateReelButton({ onClick }: CreateReelButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-4 z-40 size-14 rounded-full bg-gradient-primary shadow-glow flex items-center justify-center animate-pulse-glow md:bottom-8"
    >
      <Plus className="size-6 text-white" />
    </button>
  );
}