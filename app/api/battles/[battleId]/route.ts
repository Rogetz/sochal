import { NextRequest, NextResponse } from "next/server";

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
  const winner =
    creatorATips > creatorBTips
      ? creatorA.ownerWalletAddress
      : creatorBTips > creatorATips
        ? creatorB.ownerWalletAddress
        : battle.winnerLive ? battle.winnerLive.ownerWalletAddress : null;

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
    winner,
    winnerHandle: battle.winnerLive?.owner.handle ?? null,
    startedAt: battle.pairedAt,
    pairedAt: battle.pairedAt,
    endedAt: battle.endedAt,
    viewersA: 0,
    viewersB: 0,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ battleId: string }> }
) {
  try {
    const { battleId } = await params;

    const battle = await prisma.challengeBattle.findUnique({
      where: { id: battleId },
      include: {
        challenge: true,
        creatorA: { include: { owner: true, challengeCreator: true } },
        creatorB: { include: { owner: true, challengeCreator: true } },
        winnerLive: { include: { owner: true } },
      },
    });

    if (!battle) {
      return NextResponse.json({ error: "Battle not found" }, { status: 404 });
    }

    return NextResponse.json({ battle: serializeBattle(battle) });
  } catch (error) {
    console.error("Battle detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch battle" },
      { status: 500 }
    );
  }
}