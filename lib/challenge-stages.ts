import type { ChallengeStage } from "@/app/generated/prisma/enums";

export const CHALLENGE_STAGE_CAPACITY: Record<ChallengeStage, number> = {
  ROUND_OF_32: 32,
  ROUND_OF_30: 30,
  ROUND_OF_28: 28,
  ROUND_OF_26: 26,
  ROUND_OF_24: 24,
};

export const CHALLENGE_STAGE_SEQUENCE: ChallengeStage[] = [
  "ROUND_OF_32",
  "ROUND_OF_30",
  "ROUND_OF_28",
  "ROUND_OF_26",
  "ROUND_OF_24",
];

export function getNextChallengeStage(
  stage: ChallengeStage
): ChallengeStage | null {
  const currentIndex = CHALLENGE_STAGE_SEQUENCE.indexOf(stage);

  if (currentIndex < 0 || currentIndex === CHALLENGE_STAGE_SEQUENCE.length - 1) {
    return null;
  }

  return CHALLENGE_STAGE_SEQUENCE[currentIndex + 1];
}