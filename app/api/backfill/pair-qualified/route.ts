import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const BATTLE_SCHEDULE_DELAY_MINUTES = 15;

type BackfillRequest = {
  run?: boolean;
  secret?: string;
  challengeId?: string | null;
};

async function getOccupiedBattleLiveIds(challengeId?: string) {
  const activeBattles = await prisma.challengeBattle.findMany({
    where: {
      status: "ACTIVE",
      ...(challengeId ? { challengeId } : {}),
    },
    select: {
      creatorALiveId: true,
      creatorBLiveId: true,
    },
  });

  return new Set(
    activeBattles.flatMap((battle) => [battle.creatorALiveId, battle.creatorBLiveId])
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BackfillRequest;
    const expectedSecret = process.env.BACKFILL_SECRET;
    const suppliedSecret = body.secret ?? request.headers.get("x-backfill-secret");

    if (!expectedSecret || suppliedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const run = body.run === true;
    const challengeId = body.challengeId ?? undefined;

    const challengeIds = challengeId
      ? [challengeId]
      : (
          await prisma.challengeCreator.findMany({
            where: { status: "QUALIFIED" },
            distinct: ["challengeId"],
            select: { challengeId: true },
          })
        ).map((entry) => entry.challengeId);

    const groups = await Promise.all(
      challengeIds.map(async (currentChallengeId) => {
        const occupiedLiveIds = await getOccupiedBattleLiveIds(currentChallengeId);
        const occupiedLiveIdList = Array.from(occupiedLiveIds);

        const creators = await prisma.challengeCreator.findMany({
          where: {
            challengeId: currentChallengeId,
            status: "QUALIFIED",
            liveStreamId: {
              not: null,
              ...(occupiedLiveIdList.length > 0 ? { notIn: occupiedLiveIdList } : {}),
            },
          },
          include: {
            creator: true,
            live: true,
          },
          orderBy: [{ qualifiedAt: "asc" }, { createdAt: "asc" }],
        });

        const eligibleCreators = creators.filter(
          (entry) => entry.live?.status === "ACTIVE"
        );

        const pairs = [] as Array<{
          a: (typeof eligibleCreators)[number];
          b: (typeof eligibleCreators)[number];
        }>;

        for (let index = 0; index + 1 < eligibleCreators.length; index += 2) {
          pairs.push({ a: eligibleCreators[index], b: eligibleCreators[index + 1] });
        }

        return {
          challengeId: currentChallengeId,
          eligibleCreators,
          pairs,
        };
      })
    );

    const eligibleCount = groups.reduce((total, group) => total + group.eligibleCreators.length, 0);
    const pairs = groups.flatMap((group) =>
      group.pairs.map((pair) => ({
        challengeId: group.challengeId,
        a: pair.a,
        b: pair.b,
      }))
    );

    if (!run) {
      return NextResponse.json({
        dryRun: true,
        eligibleCount,
        pairs: pairs.map((pair) => ({
          challengeId: pair.challengeId,
          creatorA: {
            walletAddress: pair.a.creatorWalletAddress,
            liveId: pair.a.live?.id ?? null,
            qualifiedAt: pair.a.qualifiedAt,
          },
          creatorB: {
            walletAddress: pair.b.creatorWalletAddress,
            liveId: pair.b.live?.id ?? null,
            qualifiedAt: pair.b.qualifiedAt,
          },
        })),
      });
    }

    const createdBattles: Array<{
      id: string;
      challengeId: string;
      creatorALiveId: string;
      creatorBLiveId: string;
      pairedAt: Date;
    }> = [];

    await prisma.$transaction(async (tx) => {
      for (const pair of pairs) {
        const creatorALiveId = pair.a.live!.id;
        const creatorBLiveId = pair.b.live!.id;

        const alreadyPaired = await tx.challengeBattle.findFirst({
          where: {
            status: "ACTIVE",
            OR: [
              { creatorALiveId },
              { creatorBLiveId },
            ],
          },
          select: { id: true },
        });

        if (alreadyPaired) {
          continue;
        }

        const sortedLiveIds = [creatorALiveId, creatorBLiveId].sort();

        const battle = await tx.challengeBattle.create({
          data: {
            challengeId: pair.a.challengeId,
            creatorALiveId: sortedLiveIds[0],
            creatorBLiveId: sortedLiveIds[1],
            status: "ACTIVE",
            pairedAt: new Date(
              Date.now() + BATTLE_SCHEDULE_DELAY_MINUTES * 60 * 1000
            ),
          },
        });

        createdBattles.push(battle);
      }
    });

    return NextResponse.json({
      dryRun: false,
      createdCount: createdBattles.length,
      createdBattles,
    });
  } catch (error) {
    console.error("Backfill pairing error:", error);
    return NextResponse.json(
      { error: "Failed to run backfill" },
      { status: 500 }
    );
  }
}
