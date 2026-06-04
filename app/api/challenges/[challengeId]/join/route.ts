import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { CHALLENGE_STAGE_CAPACITY } from "@/lib/challenge-stages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const joinChallengeSchema = z.object({
  creatorWalletAddress: z.string().trim().min(1),
  creatorHandle: z.string().trim().min(1).optional(),
  creatorDisplayName: z.string().trim().min(1).optional(),
  liveStreamId: z.string().trim().min(1).optional(),
});

async function ensureUser(input: {
  walletAddress: string;
  handle?: string;
  displayName?: string;
}) {
  return prisma.user.upsert({
    where: { walletAddress: input.walletAddress },
    update: {
      handle: input.handle ?? undefined,
      displayName: input.displayName ?? undefined,
    },
    create: {
      walletAddress: input.walletAddress,
      handle: input.handle,
      displayName: input.displayName,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const { challengeId } = await params;
    const body = joinChallengeSchema.parse(await request.json());

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    const currentCreatorCount = await prisma.challengeCreator.count({
      where: {
        challengeId,
        status: { in: ["PENDING", "QUALIFIED"] },
      },
    });

    const maxCreators = CHALLENGE_STAGE_CAPACITY[challenge.currentStage];

    if (currentCreatorCount >= maxCreators) {
      return NextResponse.json(
        { error: "Challenge creator slots are full for the current stage" },
        { status: 409 }
      );
    }

    await ensureUser({
      walletAddress: body.creatorWalletAddress,
      handle: body.creatorHandle,
      displayName: body.creatorDisplayName,
    });

    const creator = await prisma.challengeCreator.upsert({
      where: {
        challengeId_creatorWalletAddress: {
          challengeId,
          creatorWalletAddress: body.creatorWalletAddress,
        },
      },
      update: {
        stage: challenge.currentStage,
        liveStreamId: body.liveStreamId ?? undefined,
      },
      create: {
        challengeId,
        creatorWalletAddress: body.creatorWalletAddress,
        stage: challenge.currentStage,
        liveStreamId: body.liveStreamId,
        status: "PENDING",
      },
      include: { creator: true, live: true },
    });

    return NextResponse.json({
      creator: {
        ...creator,
        totalRaisedSol: creator.totalRaisedSol.toString(),
      },
    });
  } catch (error) {
    console.error("Challenge join error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid join payload", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to join challenge" },
      { status: 500 }
    );
  }
}