"use client";

import { useEffect, useMemo } from "react";
import { Crown, Flame, Sparkles, Trophy, Zap } from "lucide-react";

type TipCelebrationProps = {
  amountSol: number | null;
  creatorLabel?: string;
  onFinished?: () => void;
  mode?: "tip" | "achievement";
};

type TipTier = {
  label: string;
  duration: number;
  particles: number;
  icon: typeof Sparkles;
  glow: string;
  badge: string;
};

const TIERS: TipTier[] = [
  {
    label: "Pocket Spark",
    duration: 0.55,
    particles: 6,
    icon: Sparkles,
    glow: "rgba(56, 189, 248, 0.45)",
    badge: "text-sky-200",
  },
  {
    label: "Heat Wave",
    duration: 0.95,
    particles: 10,
    icon: Zap,
    glow: "rgba(245, 158, 11, 0.45)",
    badge: "text-amber-200",
  },
  {
    label: "Wild Burst",
    duration: 1.35,
    particles: 14,
    icon: Flame,
    glow: "rgba(248, 113, 113, 0.5)",
    badge: "text-red-200",
  },
  {
    label: "Crown Riot",
    duration: 1.8,
    particles: 18,
    icon: Crown,
    glow: "rgba(168, 85, 247, 0.55)",
    badge: "text-fuchsia-200",
  },
  {
    label: "Legend Drop",
    duration: 2,
    particles: 24,
    icon: Trophy,
    glow: "rgba(250, 204, 21, 0.58)",
    badge: "text-yellow-100",
  },
];

function getTier(amountSol: number) {
  if (amountSol < 0.25) return TIERS[0];
  if (amountSol < 0.5) return TIERS[1];
  if (amountSol < 1) return TIERS[2];
  if (amountSol < 5) return TIERS[3];
  return TIERS[4];
}

export function TipCelebration({
  amountSol,
  creatorLabel,
  onFinished,
  mode = "tip",
}: TipCelebrationProps) {
  const tier = useMemo(
    () => {
      if (amountSol === null) return null;
      if (mode === "achievement") {
        return {
          label: "Target Reached",
          duration: 5,
          particles: 42,
          icon: Trophy,
          glow: "rgba(251, 191, 36, 0.68)",
          badge: "text-yellow-100",
        } satisfies TipTier;
      }

      return getTier(amountSol);
    },
    [amountSol, mode]
  );

  const particles = useMemo(() => {
    if (!tier || amountSol === null) return [];

    return Array.from({ length: tier.particles }, (_, index) => {
      const angle = (index / tier.particles) * Math.PI * 2;
      const radius = 120 + Math.random() * 90;
      return {
        id: `${index}-${amountSol}`,
        left: `${50 + Math.cos(angle) * (1.5 + Math.random() * 18)}%`,
        top: `${50 + Math.sin(angle) * (1.5 + Math.random() * 18)}%`,
        dx: Math.cos(angle) * radius,
        dy: Math.sin(angle) * radius,
        size: 6 + Math.random() * 10,
        rotate: Math.random() * 360,
        duration: tier.duration,
        delay: Math.random() * 0.15,
      };
    });
  }, [amountSol, tier]);

  useEffect(() => {
    if (!tier) return;

    const timer = window.setTimeout(() => {
      onFinished?.();
    }, tier.duration * 1000);

    return () => window.clearTimeout(timer);
  }, [onFinished, tier]);

  if (!tier || amountSol === null) {
    return null;
  }

  const Icon = tier.icon;

  return (
    <div className="pointer-events-none absolute inset-0 z-[80] overflow-hidden">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />

      <div className="absolute inset-0">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="absolute rounded-full bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.85)]"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              transform: `translate(-50%, -50%)`,
              animation: `tip-particle ${particle.duration}s ease-out ${particle.delay}s forwards`,
              ['--tip-dx' as never]: `${particle.dx}px`,
              ['--tip-dy' as never]: `${particle.dy}px`,
              ['--tip-rotate' as never]: `${particle.rotate}deg`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex flex-col items-center gap-4 text-center">
          <div className="absolute inset-0 -z-10 rounded-full blur-3xl" style={{ background: tier.glow, width: 260, height: 260 }} />

          <div
            className="relative flex size-28 items-center justify-center rounded-full border border-white/20 bg-black/55 shadow-[0_0_80px_rgba(255,255,255,0.16)]"
            style={{ animation: `tip-core ${tier.duration}s ease-out forwards` }}
          >
            <div className="absolute inset-0 rounded-full border border-white/10 animate-ping" style={{ animationDuration: `${tier.duration}s` }} />
            <Icon className="size-12 text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.55)]" />
          </div>

          <div className="rounded-full border border-white/15 bg-black/75 px-5 py-3 shadow-2xl backdrop-blur-md">
            <p className={`text-[11px] font-bold uppercase tracking-[0.38em] ${tier.badge}`}>
              {tier.label}
            </p>
            <p className="mt-1 text-3xl font-black text-white">
              {mode === "achievement" ? `${amountSol.toFixed(2)} SOL locked in` : `+${amountSol.toFixed(2)} SOL`}
            </p>
            {creatorLabel ? (
              <p className="mt-1 text-sm text-white/80">
                {mode === "achievement" ? `Celebrating ${creatorLabel}` : `for ${creatorLabel}`}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes tip-core {
          0% {
            transform: scale(0.6) rotate(-12deg);
            opacity: 0;
            filter: blur(6px);
          }
          35% {
            transform: scale(1.08) rotate(6deg);
            opacity: 1;
            filter: blur(0px);
          }
          70% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: scale(1.15) rotate(10deg);
            opacity: 0;
          }
        }

        @keyframes tip-particle {
          0% {
            transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--tip-dx)), calc(-50% + var(--tip-dy))) scale(1.2) rotate(var(--tip-rotate));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
