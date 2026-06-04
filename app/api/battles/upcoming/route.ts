import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const BATTLE_SCHEDULE_DELAY_MINUTES = 15;

function getBattleTarget(battle: {
  creatorA: { targetSol: { toString(): string } | number; challengeCreator?: { qualifiedAt: Date | null } | null };
  creatorB: { targetSol: { toString(): string } | number; challengeCreator?: { qualifiedAt: Date | null } | null };
}) {
  const creatorAQualifiedAt = battle.creatorA.challengeCreator?.qualifiedAt
    ? new Date(battle.creatorA.challengeCreator.qualifiedAt).getTime()
    : null;
  const creatorBQualifiedAt = battle.creatorB.challengeCreator?.qualifiedAt
    ? new Date(battle.creatorB.challengeCreator.qualifiedAt).getTime()
    : null;

  const firstCreatorTarget =
    creatorAQualifiedAt !== null &&
    (creatorBQualifiedAt === null || creatorAQualifiedAt <= creatorBQualifiedAt)
      ? Number(battle.creatorA.targetSol)
      : Number(battle.creatorB.targetSol);

  return firstCreatorTarget * 2;
}

async function backfillChallengePairings(challengeId: string) {
  const activeBattles = await prisma.challengeBattle.findMany({
    where: { challengeId, status: "ACTIVE" },
    include: {
      creatorA: { include: { challengeCreator: true } },
      creatorB: { include: { challengeCreator: true } },
    },
  });

  const occupied = new Set(
    activeBattles
      .filter((battle) => {
        const currentSol = Number(battle.creatorA.totalCollectedSol) + Number(battle.creatorB.totalCollectedSol);
        return currentSol < getBattleTarget(battle);
      })
      .flatMap((battle) => [battle.creatorA.id, battle.creatorB.id])
  );

  const occupiedList = Array.from(occupied);

  const qualifiedCreators = await prisma.challengeCreator.findMany({
    where: {
      challengeId,
      status: "QUALIFIED",
      liveStreamId: {
        not: null,
        ...(occupiedList.length > 0 ? { notIn: occupiedList } : {}),
      },
    },
    include: {
      live: true,
      creator: true,
    },
    orderBy: [{ qualifiedAt: "asc" }, { createdAt: "asc" }],
  });

  const eligibleCreators = qualifiedCreators.filter(
    (entry) => entry.live?.status === "ACTIVE"
  );

  for (let index = 0; index + 1 < eligibleCreators.length; index += 2) {
    const creatorA = eligibleCreators[index];
    const creatorB = eligibleCreators[index + 1];

    const currentLiveId = creatorA.live!.id;
    const opponentLiveId = creatorB.live!.id;

    const existingBattle = await prisma.challengeBattle.findFirst({
      where: {
        challengeId,
        status: "ACTIVE",
        OR: [
          { creatorALiveId: currentLiveId },
          { creatorBLiveId: currentLiveId },
          { creatorALiveId: opponentLiveId },
          { creatorBLiveId: opponentLiveId },
        ],
      },
      select: { id: true },
    });

    if (existingBattle) {
      continue;
    }

    const creatorALiveId = currentLiveId < opponentLiveId ? currentLiveId : opponentLiveId;
    const creatorBLiveId = currentLiveId < opponentLiveId ? opponentLiveId : currentLiveId;

    await prisma.challengeBattle.create({
      data: {
        challengeId,
        creatorALiveId,
        creatorBLiveId,
        status: "ACTIVE",
        pairedAt: new Date(Date.now() + BATTLE_SCHEDULE_DELAY_MINUTES * 60 * 1000),
      },
    });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorWallet = searchParams.get("creatorWallet")?.trim() || null;
    const now = new Date();

    if (creatorWallet) {
      const qualifiedChallenges = await prisma.challengeCreator.findMany({
        where: {
          creatorWalletAddress: creatorWallet,
          status: "QUALIFIED",
        },
        select: {
          challengeId: true,
        },
        distinct: ["challengeId"],
      });

      await Promise.all(
        qualifiedChallenges.map((entry) => backfillChallengePairings(entry.challengeId))
      );
    }

    const occupiedBattles = await prisma.challengeBattle.findMany({
      where: {
        status: "ACTIVE",
      },
      include: {
        creatorA: { include: { challengeCreator: true } },
        creatorB: { include: { challengeCreator: true } },
      },
    });

    const resolveBattle = (battle: (typeof occupiedBattles)[number]) => {
      const creatorATotal = Number(battle.creatorA.totalCollectedSol);
      const creatorBTotal = Number(battle.creatorB.totalCollectedSol);
      const currentSol = creatorATotal + creatorBTotal;
      const creatorAQualifiedAt = battle.creatorA.challengeCreator?.qualifiedAt
        ? new Date(battle.creatorA.challengeCreator.qualifiedAt).getTime()
        : null;
      const creatorBQualifiedAt = battle.creatorB.challengeCreator?.qualifiedAt
        ? new Date(battle.creatorB.challengeCreator.qualifiedAt).getTime()
        : null;
      const firstCreatorTarget =
        creatorAQualifiedAt !== null &&
        (creatorBQualifiedAt === null || creatorAQualifiedAt <= creatorBQualifiedAt)
          ? Number(battle.creatorA.targetSol)
          : Number(battle.creatorB.targetSol);

      return {
        currentSol,
        targetSol: firstCreatorTarget * 2,
      };
    };

    const occupiedLiveIds = Array.from(
      new Set(
        occupiedBattles
          .filter((battle) => resolveBattle(battle).currentSol < resolveBattle(battle).targetSol)
          .flatMap((battle) => [battle.creatorA.id, battle.creatorB.id])
      )
    );

    const battles = await prisma.challengeBattle.findMany({
      where: {
        status: "ACTIVE",
        ...(creatorWallet
          ? {
              OR: [
                { creatorA: { ownerWalletAddress: creatorWallet } },
                { creatorB: { ownerWalletAddress: creatorWallet } },
              ],
            }
          : {}),
      },
      orderBy: { pairedAt: "asc" },
      include: {
        challenge: true,
        creatorA: { include: { owner: true, challengeCreator: true } },
        creatorB: { include: { owner: true, challengeCreator: true } },
      },
    });

    const serializeBattle = (battle: (typeof battles)[number]) => {
      const creatorATotal = Number(battle.creatorA.totalCollectedSol);
      const creatorBTotal = Number(battle.creatorB.totalCollectedSol);
      const currentSol = creatorATotal + creatorBTotal;
      const targetSol = getBattleTarget(battle);
      const isDue = battle.pairedAt <= now;
      const isCompleted = battle.status !== "ACTIVE" || currentSol >= targetSol;

      return {
        id: battle.id,
        challengeId: battle.challengeId,
        challengeTitle: battle.challenge.title,
        topic: battle.challenge.topic,
        scheduledAt: battle.pairedAt,
        isDue,
        canEnterBattle: isDue && !isCompleted,
        currentSol,
        targetSol,
        tipsA: creatorATotal,
        tipsB: creatorBTotal,
        battleStatus: isCompleted ? "completed" : "active",
        creatorA: {
          walletAddress: battle.creatorA.ownerWalletAddress,
          displayName:
            battle.creatorA.owner.displayName ??
            battle.creatorA.owner.handle ??
            battle.creatorA.ownerWalletAddress,
          handle: battle.creatorA.owner.handle,
          avatar: "https://randomuser.me/api/portraits/lego/1.jpg",
        },
        creatorB: {
          walletAddress: battle.creatorB.ownerWalletAddress,
          displayName:
            battle.creatorB.owner.displayName ??
            battle.creatorB.owner.handle ??
            battle.creatorB.ownerWalletAddress,
          handle: battle.creatorB.owner.handle,
          avatar: "https://randomuser.me/api/portraits/lego/2.jpg",
        },
      };
    };

    const qualifiedCreators = creatorWallet
      ? await prisma.challengeCreator.findMany({
          where: {
            status: "QUALIFIED",
            creatorWalletAddress: { not: creatorWallet },
            liveStreamId: {
              not: null,
              ...(occupiedLiveIds.length > 0 ? { notIn: occupiedLiveIds } : {}),
            },
          },
          include: {
            creator: true,
            challenge: true,
          },
          orderBy: [{ qualifiedAt: "asc" }, { createdAt: "asc" }],
        })
      : [];

    return NextResponse.json({
      battles: battles.map(serializeBattle).filter((battle) => battle.battleStatus === "active"),
      qualifiedCreators: qualifiedCreators.map((entry) => ({
        challengeId: entry.challengeId,
        challengeTitle: entry.challenge.title,
        topic: entry.challenge.topic,
        creatorWalletAddress: entry.creatorWalletAddress,
        creatorDisplayName:
          entry.creator.displayName ??
          entry.creator.handle ??
          entry.creatorWalletAddress,
        creatorHandle: entry.creator.handle,
        creatorAvatar: "https://randomuser.me/api/portraits/lego/1.jpg",
        qualifiedAt: entry.qualifiedAt,
      })),
    });
  } catch (error) {
    console.error("Upcoming battles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming battles" },
      { status: 500 }
    );
  }
}
