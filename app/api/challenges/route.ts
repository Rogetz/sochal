import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { CHALLENGE_STAGE_CAPACITY } from "@/lib/challenge-stages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const createChallengeSchema = z.object({
  onChainAddress: z.string().trim().min(1).optional(),
  creatorWalletAddress: z.string().trim().min(1),
  creatorHandle: z.string().trim().min(1).optional(),
  creatorDisplayName: z.string().trim().min(1).optional(),
  topic: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  targetMin: z.coerce.number().positive(),
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

function serializeChallenge(
  challenge: Awaited<ReturnType<typeof prisma.challenge.findFirst>> & {
    creators: Awaited<ReturnType<typeof prisma.challengeCreator.findMany>>;
  } | null
) {
  if (!challenge) {
    return challenge;
  }

  return {
    ...challenge,
    targetMin: challenge.targetMin.toString(),
    totalCollectedSol: challenge.totalCollectedSol.toString(),
    maxCreators: CHALLENGE_STAGE_CAPACITY[challenge.currentStage],
    creators: challenge.creators.map((entry) => ({
      ...entry,
      totalRaisedSol: entry.totalRaisedSol.toString(),
    })),
  };
}

export async function GET() {
  try {
    const challenges = await prisma.challenge.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        creators: {
          include: { creator: true, live: true },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      challenges: challenges.map((challenge) => serializeChallenge(challenge)),
    });
  } catch (error) {
    console.error("Challenge list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch challenges" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = createChallengeSchema.parse(await request.json());

    await ensureUser({
      walletAddress: body.creatorWalletAddress,
      handle: body.creatorHandle,
      displayName: body.creatorDisplayName,
    });

    const challenge = await prisma.challenge.create({
      data: {
        onChainAddress: body.onChainAddress,
        creatorWalletAddress: body.creatorWalletAddress,
        topic: body.topic,
        title: body.title,
        description: body.description,
        targetMin: body.targetMin,
        status: "WAITING",
        currentStage: "ROUND_OF_32",
        maxCreators: CHALLENGE_STAGE_CAPACITY.ROUND_OF_32,
      },
      include: {
        creators: {
          include: { creator: true, live: true },
        },
      },
    });

    return NextResponse.json({
      challenge: serializeChallenge(challenge),
    }, { status: 201 });
  } catch (error) {
    console.error("Challenge creation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid challenge payload", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create challenge" },
      { status: 500 }
    );
  }
}