import { NextResponse } from "next/server";
//import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const upsertLiveSchema = z.object({
  streamId: z.string().trim().min(1),
  channelName: z.string().trim().min(1),
  onChainAddress: z.string().trim().min(1).optional(),
  ownerWalletAddress: z.string().trim().min(1),
  creatorHandle: z.string().trim().min(1).optional(),
  creatorDisplayName: z.string().trim().min(1).optional(),
  challengeId: z.string().trim().min(1).optional(),
  topic: z.string().trim().min(1),
  title: z.string().trim().min(1),
  targetSol: z.coerce.number().nonnegative().optional(),
  totalCollectedSol: z.coerce.number().nonnegative().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).optional(),
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

export async function GET() {
  try {
    const lives = await prisma.live.findMany({
      orderBy: { startedAt: "desc" },
      include: {
        owner: true,
        challenge: true,
        challengeCreator: true,
        contributions: true,
      },
    });

    return NextResponse.json({
      lives: lives.map((live) => ({
        ...live,
        targetSol: live.targetSol.toString(),
        totalCollectedSol: live.totalCollectedSol.toString(),
        challengeCreator: live.challengeCreator
          ? {
              ...live.challengeCreator,
              totalRaisedSol: live.challengeCreator.totalRaisedSol.toString(),
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Live list error:", error);
    return NextResponse.json({ error: "Failed to fetch lives" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = upsertLiveSchema.parse(await request.json());

    await ensureUser({
      walletAddress: body.ownerWalletAddress,
      handle: body.creatorHandle,
      displayName: body.creatorDisplayName,
    });

    let challengeId: string | undefined = body.challengeId ?? undefined;

    // If the selected challenge is stale/local-only, keep the live creation moving.
    if (challengeId) {
      const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });

      if (!challenge) {
        console.warn(`Live creation received unknown challengeId=${challengeId}; storing live without challenge link`);
        challengeId = undefined;
      }
    }

    const live = await prisma.live.upsert({
      where: { streamId: body.streamId },
      update: {
        channelName: body.channelName,
        onChainAddress: body.onChainAddress ?? undefined,
        challengeId,
        topic: body.topic,
        title: body.title,
        targetSol: body.targetSol ?? 0,
        totalCollectedSol: body.totalCollectedSol ?? 0,
        status: body.status ?? undefined,
      },
      create: {
        streamId: body.streamId,
        channelName: body.channelName,
        onChainAddress: body.onChainAddress,
        ownerWalletAddress: body.ownerWalletAddress,
        challengeId,
        topic: body.topic,
        title: body.title,
        targetSol: body.targetSol ?? 0,
        totalCollectedSol: body.totalCollectedSol ?? 0,
        status: body.status ?? "ACTIVE",
      },
      include: {
        owner: true,
        challenge: true,
        challengeCreator: true,
      },
    });

    return NextResponse.json({
      live: {
        ...live,
        targetSol: live.targetSol.toString(),
        totalCollectedSol: live.totalCollectedSol.toString(),
        challengeCreator: live.challengeCreator
          ? {
              ...live.challengeCreator,
              totalRaisedSol: live.challengeCreator.totalRaisedSol.toString(),
            }
          : null,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Live creation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid live payload", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to store live" }, { status: 500 });
  }
}
