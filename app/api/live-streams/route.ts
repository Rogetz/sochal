import { NextResponse } from "next/server";

import type { Battle } from "@/lib/battle-service";
import type { LiveStream, Topic } from "@/lib/sochal-store";
import {
  deleteLiveRecord,
  getLiveRecord,
  upsertLiveRecord,
  updateLiveRecord,
  type LiveStreamRecord,
} from "@/lib/live-registry";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function serializeBattle(battle: any): Battle {
  const creatorA = battle.creatorA;
  const creatorB = battle.creatorB;
  const creatorAOwner = creatorA.owner;
  const creatorBOwner = creatorB.owner;
  const winnerLive = battle.winnerLive;
  const winnerOwner = winnerLive?.owner ?? null;
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
    creatorAHandle: creatorAOwner.handle ?? "",
    creatorAName: creatorAOwner.displayName ?? creatorAOwner.handle ?? creatorA.ownerWalletAddress,
    creatorAAvatar: "https://randomuser.me/api/portraits/lego/1.jpg",
    creatorB: creatorB.ownerWalletAddress,
    creatorBHandle: creatorBOwner.handle ?? null,
    creatorBName: creatorBOwner.displayName ?? creatorBOwner.handle ?? null,
    creatorBAvatar: "https://randomuser.me/api/portraits/lego/2.jpg",
    topic: battle.challenge.topic,
    title: `${creatorA.title} VS ${creatorB.title}`,
    targetSol,
    currentSol,
    tipsA: creatorATips,
    tipsB: creatorBTips,
    status: isCompleted ? "completed" : "active",
    winner: winnerLive ? winnerLive.ownerWalletAddress : null,
    winnerHandle: winnerOwner ? winnerOwner.handle ?? null : null,
    startedAt: battle.pairedAt,
    pairedAt: battle.pairedAt,
    endedAt: battle.endedAt,
    viewersA: 0,
    viewersB: 0,
  };
}

async function fetchPersistedBattle(channelName: string): Promise<Battle | null> {
  const live = await prisma.live.findUnique({
    where: { channelName },
    include: {
      owner: true,
      challenge: true,
      battleAsCreatorA: {
        include: {
          challenge: true,
          creatorA: { include: { owner: true, challengeCreator: true } },
          creatorB: { include: { owner: true, challengeCreator: true } },
          winnerLive: { include: { owner: true } },
        },
      },
      battleAsCreatorB: {
        include: {
          challenge: true,
          creatorA: { include: { owner: true, challengeCreator: true } },
          creatorB: { include: { owner: true, challengeCreator: true } },
          winnerLive: { include: { owner: true } },
        },
      },
    },
  });

  const battle = live?.battleAsCreatorA ?? live?.battleAsCreatorB ?? null;
  return battle ? serializeBattle(battle) : null;
}

async function fetchPersistedLiveStream(channelName: string): Promise<LiveStreamRecord | null> {
  const live = await prisma.live.findUnique({
    where: { channelName },
    include: {
      owner: true,
      challenge: true,
      battleAsCreatorA: {
        include: {
          challenge: true,
          creatorA: { include: { owner: true, challengeCreator: true } },
          creatorB: { include: { owner: true, challengeCreator: true } },
          winnerLive: { include: { owner: true } },
        },
      },
      battleAsCreatorB: {
        include: {
          challenge: true,
          creatorA: { include: { owner: true, challengeCreator: true } },
          creatorB: { include: { owner: true, challengeCreator: true } },
          winnerLive: { include: { owner: true } },
        },
      },
    },
  });

  if (!live) {
    return null;
  }

  const battle = live.battleAsCreatorA ?? live.battleAsCreatorB ?? null;

  return {
    id: live.streamId,
    channelName: live.channelName,
    ownerWallet: live.ownerWalletAddress,
    onChainAddress: live.onChainAddress ?? undefined,
    challengeId: live.challengeId ?? undefined,
    handle: live.owner.handle ?? "",
    displayName: live.owner.displayName ?? live.owner.handle ?? live.ownerWalletAddress,
    topic: live.topic as Topic,
    title: live.title,
    startedAt: live.startedAt.getTime(),
    isLive: live.status === "ACTIVE",
    potSol: Number(live.totalCollectedSol),
    targetSol: Number(live.targetSol),
    viewers: 0,
    battle: battle ? serializeBattle(battle) : null,
    updatedAt: live.updatedAt.getTime(),
  };
}

function asLiveStream(record: LiveStreamRecord): LiveStream {
  return {
    id: record.id,
    ownerWallet: record.ownerWallet,
    onChainAddress: record.onChainAddress,
    handle: record.handle,
    displayName: record.displayName,
    topic: record.topic,
    title: record.title,
    startedAt: record.startedAt,
    isLive: record.isLive,
    potSol: record.potSol,
    targetSol: record.targetSol,
    viewers: record.viewers,
    challengeId: record.challengeId,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelName = searchParams.get("channelName");

  if (channelName) {
    const persistedStream = await fetchPersistedLiveStream(channelName);

    if (persistedStream && persistedStream.isLive) {
      return NextResponse.json({
        stream: asLiveStream(persistedStream),
      });
    }

    return NextResponse.json(
      { error: "Stream not found" },
      { status: 404 }
    );
  }

  const activeLives = await prisma.live.findMany({
    where: { status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
    include: {
      owner: true,
      challenge: true,
      battleAsCreatorA: {
        include: {
          challenge: true,
          creatorA: { include: { owner: true } },
          creatorB: { include: { owner: true } },
          winnerLive: { include: { owner: true } },
        },
      },
      battleAsCreatorB: {
        include: {
          challenge: true,
          creatorA: { include: { owner: true } },
          creatorB: { include: { owner: true } },
          winnerLive: { include: { owner: true } },
        },
      },
    },
  });

  const streams = activeLives.map((live) => {
    const battle = live.battleAsCreatorA ?? live.battleAsCreatorB ?? null;

    return {
      id: live.streamId,
      channelName: live.channelName,
      ownerWallet: live.ownerWalletAddress,
      onChainAddress: live.onChainAddress ?? undefined,
      challengeId: live.challengeId ?? undefined,
      handle: live.owner.handle ?? "",
      displayName: live.owner.displayName ?? live.owner.handle ?? live.ownerWalletAddress,
      topic: live.topic as Topic,
      title: live.title,
      startedAt: live.startedAt.getTime(),
      isLive: live.status === "ACTIVE",
      potSol: Number(live.totalCollectedSol),
      targetSol: Number(live.targetSol),
      viewers: 0,
      battle: battle ? serializeBattle(battle) : null,
      updatedAt: live.updatedAt.getTime(),
    } satisfies LiveStreamRecord;
  });

  return NextResponse.json({ streams });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const channelName = String(body.channelName ?? "").trim();
    const ownerWallet = String(body.ownerWallet ?? "").trim();
    const onChainAddress = String(body.onChainAddress ?? "").trim();
    const handle = String(body.handle ?? "").trim();
    const displayName = String(body.displayName ?? "").trim();
    const topic = body.topic as Topic;
    const title = String(body.title ?? "").trim();
    const targetSol = Number(body.targetSol ?? 0);
    const potSol = Number(body.potSol ?? 0);

    if (!channelName || !ownerWallet || !handle || !displayName || !title) {
      return NextResponse.json(
        { error: "Invalid stream payload" },
        { status: 400 }
      );
    }

    const now = Date.now();

    const stream = upsertLiveRecord({
      id: channelName,
      channelName,
      ownerWallet,
      onChainAddress: onChainAddress || undefined,
      challengeId: String(body.challengeId ?? "").trim() || undefined,
      handle,
      displayName,
      topic,
      title,
      startedAt: now,
      isLive: true,
      potSol: Number.isFinite(potSol) ? potSol : 0,
      targetSol: Number.isFinite(targetSol) ? targetSol : 0,
      // Start with zero viewers (exclude the creator)
      viewers: 0,
      battle: null,
    });

    await prisma.user.upsert({
      where: { walletAddress: ownerWallet },
      update: {
        handle: handle || undefined,
        displayName: displayName || undefined,
      },
      create: {
        walletAddress: ownerWallet,
        handle,
        displayName,
      },
    });

    await prisma.live.upsert({
      where: { streamId: channelName },
      update: {
        channelName,
        onChainAddress: onChainAddress || null,
        challengeId: String(body.challengeId ?? "").trim() || null,
        topic,
        title,
        targetSol: Number.isFinite(targetSol) ? targetSol : 0,
        totalCollectedSol: Number.isFinite(potSol) ? potSol : 0,
        status: "ACTIVE",
        startedAt: new Date(now),
        endedAt: null,
      },
      create: {
        streamId: channelName,
        channelName,
        onChainAddress: onChainAddress || undefined,
        ownerWalletAddress: ownerWallet,
        challengeId: String(body.challengeId ?? "").trim() || undefined,
        topic,
        title,
        targetSol: Number.isFinite(targetSol) ? targetSol : 0,
        totalCollectedSol: Number.isFinite(potSol) ? potSol : 0,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ ok: true, stream: asLiveStream(stream) });
  } catch (error) {
    console.error("Live stream registration error:", error);

    return NextResponse.json(
      { error: "Failed to register live stream" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const channelName = String(body.channelName ?? "").trim();

    if (!channelName) {
      return NextResponse.json(
        { error: "channelName is required" },
        { status: 400 }
      );
    }

    const viewerDelta = Number(body.viewerDelta ?? 0);
    const potDelta = Number(body.potDelta ?? 0);

    // Tip totals are persisted by the contributions API; this route
    // keeps the in-memory live registry in sync for realtime viewers.
    let next: LiveStreamRecord | null | undefined = getLiveRecord(channelName);

    if (next) {
      const nextViewers = Number.isFinite(viewerDelta)
        ? Math.max(1, next.viewers + viewerDelta)
        : next.viewers;

      const nextPotSol = Number.isFinite(potDelta)
        ? Math.max(0, next.potSol + potDelta)
        : next.potSol;

      next = updateLiveRecord(channelName, {
        viewers: nextViewers,
        potSol: nextPotSol,
      });
    }

    if (!next) {
      const persistedStream = await fetchPersistedLiveStream(channelName);

      if (!persistedStream) {
        return NextResponse.json(
          { error: "Stream not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ ok: true, stream: asLiveStream(persistedStream) });
    }

    return NextResponse.json({ ok: true, stream: asLiveStream(next) });
  } catch (error) {
    console.error("Live stream update error:", error);

    return NextResponse.json(
      { error: "Failed to update live stream" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const channelName = String(body.channelName ?? "").trim();

    if (!channelName) {
      return NextResponse.json(
        { error: "channelName is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.live.findUnique({
      where: { channelName },
    });

    deleteLiveRecord(channelName);

    if (existing) {
      await prisma.live.update({
        where: { channelName },
        data: {
          status: "CLOSED",
          endedAt: new Date(),
        },
      });

      await prisma.challengeBattle.updateMany({
        where: {
          status: "ACTIVE",
          OR: [
            { creatorALiveId: existing.id },
            { creatorBLiveId: existing.id },
          ],
        },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Live stream delete error:", error);

    return NextResponse.json(
      { error: "Failed to delete live stream" },
      { status: 500 }
    );
  }
}
