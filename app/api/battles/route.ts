import { NextResponse } from "next/server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Battle } from "@/lib/battle-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function serializeBattle(battle: any): Battle {
  const creatorA = battle.creatorA;
  const creatorB = battle.creatorB;
  const creatorATips = Number(creatorA.totalCollectedSol);
  const creatorBTips = Number(creatorB.totalCollectedSol);
  const creatorAQualifiedAt = creatorA.challengeCreator?.qualifiedAt
    ? new Date(creatorA.challengeCreator.qualifiedAt).getTime()
    : null;
  const creatorBQualifiedAt = creatorB.challengeCreator?.qualifiedAt
    ? new Date(creatorB.challengeCreator.qualifiedAt).getTime()
    : null;
  const firstCreatorTarget =
    creatorAQualifiedAt !== null &&
    (creatorBQualifiedAt === null || creatorAQualifiedAt <= creatorBQualifiedAt)
      ? Number(creatorA.targetSol)
      : Number(creatorB.targetSol);
  const targetSol = firstCreatorTarget * 2;
  const currentSol = creatorATips + creatorBTips;
  const isCompleted = battle.status !== "ACTIVE" || currentSol >= targetSol;

  return {
    id: battle.id,
    creatorA: creatorA.ownerWalletAddress,
    creatorAHandle: creatorA.owner.handle ?? "",
    creatorAName: creatorA.owner.displayName ?? creatorA.owner.handle ?? creatorA.ownerWalletAddress,
    creatorAAvatar: "https://randomuser.me/api/portraits/lego/1.jpg",
    creatorB: creatorB.ownerWalletAddress,
    creatorBHandle: creatorB.owner.handle ?? null,
    creatorBName: creatorB.owner.displayName ?? creatorB.owner.handle ?? null,
    creatorBAvatar: "https://randomuser.me/api/portraits/lego/2.jpg",
    topic: battle.challenge.topic,
    title: `${creatorA.title} VS ${creatorB.title}`,
    targetSol,
    currentSol,
    tipsA: creatorATips,
    tipsB: creatorBTips,
    status: isCompleted ? "completed" : "active",
    winner: battle.winnerLive ? battle.winnerLive.ownerWalletAddress : null,
    winnerHandle: battle.winnerLive?.owner.handle ?? null,
    startedAt: battle.pairedAt,
    pairedAt: battle.pairedAt,
    endedAt: battle.endedAt,
    viewersA: 0,
    viewersB: 0,
  };
}

export async function GET() {
  try {
    const now = new Date();

    const battles = await prisma.challengeBattle.findMany({
      where: {
        status: "ACTIVE",
        pairedAt: {
          lte: now,
        },
      },
      orderBy: { pairedAt: "desc" },
      include: {
        challenge: true,
        creatorA: { include: { owner: true, challengeCreator: true } },
        creatorB: { include: { owner: true, challengeCreator: true } },
        winnerLive: { include: { owner: true } },
      },
    });

    return NextResponse.json({
      battles: battles.map((battle) => serializeBattle(battle)),
    });
  } catch (error) {
    console.error("Battle list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch battles" },
      { status: 500 }
    );
  }
}