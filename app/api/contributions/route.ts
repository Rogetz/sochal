import { NextResponse } from "next/server";
import { z } from "zod";

import { CHALLENGE_STAGE_CAPACITY } from "@/lib/challenge-stages";
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Battle } from "@/lib/battle-service";
import { prisma } from "@/lib/prisma";



export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const BATTLE_SCHEDULE_DELAY_MINUTES = 15;


const contributionSchema = z.object({
  txSignature: z.string().trim().min(1),
  scope: z.enum(["LIVE", "CHALLENGE"]),
  fanWalletAddress: z.string().trim().min(1),
  amountSol: z.coerce.number().positive(),
  blockTime: z.coerce.number().int().optional(),
  liveStreamId: z.string().trim().min(1).optional(),
  challengeId: z.string().trim().min(1).optional(),
  challengeCreatorWalletAddress: z.string().trim().min(1).optional(),
  fanHandle: z.string().trim().min(1).optional(),
  fanDisplayName: z.string().trim().min(1).optional(),
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

type BattleSource = {
  id: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  pairedAt: Date;
  endedAt: Date | null;
  challenge: { topic: string };
  winnerLive: {
    ownerWalletAddress: string;
    owner: { handle: string | null; displayName: string | null };
  } | null;
  creatorA: {
    ownerWalletAddress: string;
    title: string;
    topic: string;
    targetSol: { toString(): string } | number;
    totalCollectedSol: { toString(): string } | number;
    challengeCreator?: {
      qualifiedAt: Date | null;
    } | null;
    owner: { handle: string | null; displayName: string | null };
  };
  creatorB: {
    ownerWalletAddress: string;
    title: string;
    topic: string;
    targetSol: { toString(): string } | number;
    totalCollectedSol: { toString(): string } | number;
    challengeCreator?: {
      qualifiedAt: Date | null;
    } | null;
    owner: { handle: string | null; displayName: string | null };
  };
};

// occupied live id helper removed — opponent selection is transactional now

// opponent selection is performed transactionally at qualification time

function serializeBattle(battle: BattleSource): Battle {
  const creatorAName =
    battle.creatorA.owner.displayName ??
    battle.creatorA.owner.handle ??
    battle.creatorA.ownerWalletAddress;
  const creatorBName =
    battle.creatorB.owner.displayName ??
    battle.creatorB.owner.handle ??
    battle.creatorB.ownerWalletAddress;
  const winnerName = battle.winnerLive
    ? battle.winnerLive.owner.displayName ??
      battle.winnerLive.owner.handle ??
      battle.winnerLive.ownerWalletAddress
    : null;
  const creatorAQualifiedAt = battle.creatorA.challengeCreator?.qualifiedAt
    ? battle.creatorA.challengeCreator.qualifiedAt.getTime()
    : null;
  const creatorBQualifiedAt = battle.creatorB.challengeCreator?.qualifiedAt
    ? battle.creatorB.challengeCreator.qualifiedAt.getTime()
    : null;
  const firstCreatorTarget =
    creatorAQualifiedAt !== null &&
    (creatorBQualifiedAt === null || creatorAQualifiedAt <= creatorBQualifiedAt)
      ? Number(battle.creatorA.targetSol)
      : Number(battle.creatorB.targetSol);

  return {
    id: battle.id,
    creatorA: battle.creatorA.ownerWalletAddress,
    creatorAHandle: battle.creatorA.owner.handle ?? "",
    creatorAName,
    creatorAAvatar: "https://randomuser.me/api/portraits/lego/1.jpg",
    creatorB: battle.creatorB.ownerWalletAddress,
    creatorBHandle: battle.creatorB.owner.handle,
    creatorBName,
    creatorBAvatar: "https://randomuser.me/api/portraits/lego/2.jpg",
    topic: battle.challenge.topic,
    title: `${battle.creatorA.title} VS ${battle.creatorB.title}`,
    targetSol: firstCreatorTarget * 2,
    currentSol: 0,
    tipsA: 0,
    tipsB: 0,
    status: battle.status === "ACTIVE" ? "active" : "completed",
    winner: battle.winnerLive ? battle.winnerLive.ownerWalletAddress : null,
    winnerHandle: winnerName,
    startedAt: battle.pairedAt,
    pairedAt: battle.pairedAt,
    endedAt: battle.endedAt,
    viewersA: 0,
    viewersB: 0,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");
    const liveStreamId = searchParams.get("liveStreamId");
    const challengeId = searchParams.get("challengeId");
    const fanWalletAddress = searchParams.get("fanWalletAddress");

    const contributions = await prisma.contribution.findMany({
      where: {
        scope: scope === "LIVE" || scope === "CHALLENGE" ? scope : undefined,
        live: liveStreamId ? { streamId: liveStreamId } : undefined,
        challengeId: challengeId ?? undefined,
        fanWalletAddress: fanWalletAddress ?? undefined,
      },
      orderBy: { createdAt: "desc" },
      include: {
        fan: true,
        live: true,
        challenge: true,
        challengeCreator: true,
      },
    });

    return NextResponse.json({
      contributions: contributions.map((contribution) => ({
        ...contribution,
        amountSol: contribution.amountSol.toString(),
      })),
    });
  } catch (error) {
    console.error("Contribution list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contributions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = contributionSchema.parse(await request.json());

    await ensureUser({
      walletAddress: body.fanWalletAddress,
      handle: body.fanHandle,
      displayName: body.fanDisplayName,
    });

    const existing = await prisma.contribution.findUnique({
      where: { txSignature: body.txSignature },
    });

    if (existing) {
      return NextResponse.json({
        contribution: {
          ...existing,
          amountSol: existing.amountSol.toString(),
        },
        duplicate: true,
      });
    }

    const createdContribution = await prisma.contribution.create({
      data: {
        txSignature: body.txSignature,
        scope: body.scope,
        fanWalletAddress: body.fanWalletAddress,
        amountSol: body.amountSol,
        blockTime: body.blockTime,
      },
      include: {
        fan: true,
        live: true,
        challenge: true,
        challengeCreator: true,
      },
    });

    let updatedLive: any = null;
    let updatedChallenge: any = null;
    let updatedCreator: any = null;
    let pairing: Battle | null = null;
    let contributionChallengeId = body.challengeId ?? null;
    let contributionLiveId = null;
    let contributionCreatorId = null;

    if (body.scope === "LIVE") {
      const live = body.liveStreamId
        ? await prisma.live.findUnique({
            where: { streamId: body.liveStreamId },
            include: {
              owner: true,
              challenge: true,
            },
          })
        : null;

      if (live) {
        contributionLiveId = live.id;

        updatedLive = await prisma.live.update({
          where: { id: live.id },
          data: {
            totalCollectedSol: {
              increment: body.amountSol,
            },
          },
        });

        if (live.challengeId) {
          updatedChallenge = await prisma.challenge.update({
            where: { id: live.challengeId },
            data: {
              totalCollectedSol: {
                increment: body.amountSol,
              },
            },
          });

          const refreshedChallenge = await prisma.challenge.findUnique({
            where: { id: live.challengeId },
          });

          if (refreshedChallenge) {
            contributionChallengeId = refreshedChallenge.id;

            updatedCreator = await prisma.challengeCreator.upsert({
              where: {
                challengeId_creatorWalletAddress: {
                  challengeId: refreshedChallenge.id,
                  creatorWalletAddress: live.ownerWalletAddress,
                },
              },
              update: {
                liveStreamId: live.streamId,
                stage: refreshedChallenge.currentStage,
                status: "QUALIFIED",
                totalRaisedSol: updatedLive.totalCollectedSol,
                qualifiedAt: new Date(),
              },
              create: {
                challengeId: refreshedChallenge.id,
                creatorWalletAddress: live.ownerWalletAddress,
                liveStreamId: live.streamId,
                stage: refreshedChallenge.currentStage,
                status: "QUALIFIED",
                totalRaisedSol: updatedLive.totalCollectedSol,
                qualifiedAt: new Date(),
              },
            });

            contributionCreatorId = updatedCreator.id;

            // Make pairing atomic: upsert creator and attempt to create a ChallengeBattle
            // inside a transaction to avoid races where two creators attempt to pair at once.
            if (
              updatedLive.totalCollectedSol.greaterThanOrEqualTo(
                live.targetSol,
              )
            ) {
              const txResult = await prisma.$transaction(async (tx) => {
                // re-upsert via transaction to ensure we have a tx-scoped row
                const txCreator = await tx.challengeCreator.upsert({
                  where: {
                    challengeId_creatorWalletAddress: {
                      challengeId: refreshedChallenge.id,
                      creatorWalletAddress: live.ownerWalletAddress,
                    },
                  },
                  update: {
                    liveStreamId: live.streamId,
                    stage: refreshedChallenge.currentStage,
                    status: "QUALIFIED",
                    totalRaisedSol: updatedLive.totalCollectedSol,
                    qualifiedAt: new Date(),
                  },
                  create: {
                    challengeId: refreshedChallenge.id,
                    creatorWalletAddress: live.ownerWalletAddress,
                    liveStreamId: live.streamId,
                    stage: refreshedChallenge.currentStage,
                    status: "QUALIFIED",
                    totalRaisedSol: updatedLive.totalCollectedSol,
                    qualifiedAt: new Date(),
                  },
                });

                // compute occupied live ids for this challenge, but only for unresolved battles
                const activeBattles = await tx.challengeBattle.findMany({
                  where: { challengeId: refreshedChallenge.id, status: "ACTIVE" },
                  include: {
                    creatorA: { include: { challengeCreator: true } },
                    creatorB: { include: { challengeCreator: true } },
                  },
                });

                const occupied = new Set(
                  activeBattles
                    .filter((battle) => {
                      const creatorATips = Number(battle.creatorA.totalCollectedSol);
                      const creatorBTips = Number(battle.creatorB.totalCollectedSol);
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

                      return creatorATips + creatorBTips < firstCreatorTarget * 2;
                    })
                    .flatMap((battle) => [battle.creatorA.id, battle.creatorB.id])
                );

                // find earliest available qualified opponent in the same challenge
                const opponent = await tx.challengeCreator.findFirst({
                  where: {
                    challengeId: refreshedChallenge.id,
                    creatorWalletAddress: { not: live.ownerWalletAddress },
                    status: "QUALIFIED",
                    liveStreamId: { not: null, ...(Array.from(occupied).length ? { notIn: Array.from(occupied) } : {}) },
                  },
                  include: { live: true, creator: true },
                  orderBy: [{ qualifiedAt: "asc" }, { createdAt: "asc" }],
                });

                if (!opponent || !opponent.live || opponent.live.status !== "ACTIVE") {
                  return { txCreator, battleRow: null };
                }

                const currentLiveId = live.id;
                const opponentLiveId = opponent.live.id;

                // ensure no existing active battle ties either live
                const existingBattle = await tx.challengeBattle.findFirst({
                  where: {
                    challengeId: refreshedChallenge.id,
                    status: "ACTIVE",
                    OR: [
                      { creatorALiveId: currentLiveId },
                      { creatorBLiveId: currentLiveId },
                      { creatorALiveId: opponentLiveId },
                      { creatorBLiveId: opponentLiveId },
                    ],
                  },
                  include: {
                    challenge: true,
                    creatorA: { include: { owner: true } },
                    creatorB: { include: { owner: true } },
                    winnerLive: { include: { owner: true } },
                  },
                });

                if (existingBattle) {
                  return { txCreator, battleRow: existingBattle };
                }

                const creatorALiveId = currentLiveId < opponentLiveId ? currentLiveId : opponentLiveId;
                const creatorBLiveId = currentLiveId < opponentLiveId ? opponentLiveId : currentLiveId;

                const battleRow = await tx.challengeBattle.create({
                  data: {
                    challengeId: refreshedChallenge.id,
                    creatorALiveId,
                    creatorBLiveId,
                    status: "ACTIVE",
                    pairedAt: new Date(Date.now() + BATTLE_SCHEDULE_DELAY_MINUTES * 60 * 1000),
                  },
                  include: {
                    challenge: true,
                    creatorA: { include: { owner: true } },
                    creatorB: { include: { owner: true } },
                    winnerLive: { include: { owner: true } },
                  },
                });

                return { txCreator, battleRow };
              });

              updatedCreator = txResult.txCreator;
              if (txResult.battleRow) {
                pairing = serializeBattle(txResult.battleRow as BattleSource);
              }
            }

            const qualifiedCreators = await prisma.challengeCreator.count({
              where: {
                challengeId: refreshedChallenge.id,
                status: "QUALIFIED",
              },
            });

            const capacity = CHALLENGE_STAGE_CAPACITY[refreshedChallenge.currentStage];

            if (qualifiedCreators > capacity) {
              await prisma.challenge.update({
                where: { id: refreshedChallenge.id },
                data: { maxCreators: capacity },
              });
            }
          }
        }
      }
    }

    if (body.scope === "CHALLENGE" && body.challengeId) {
      contributionChallengeId = body.challengeId;

      updatedChallenge = await prisma.challenge.update({
        where: { id: body.challengeId },
        data: {
          totalCollectedSol: {
            increment: body.amountSol,
          },
        },
      });

      if (body.challengeCreatorWalletAddress) {
        updatedCreator = await prisma.challengeCreator.upsert({
          where: {
            challengeId_creatorWalletAddress: {
              challengeId: body.challengeId,
              creatorWalletAddress: body.challengeCreatorWalletAddress,
            },
          },
          update: {
            totalRaisedSol: {
              increment: body.amountSol,
            },
          },
          create: {
            challengeId: body.challengeId,
            creatorWalletAddress: body.challengeCreatorWalletAddress,
            stage: "ROUND_OF_32",
            status: "PENDING",
            totalRaisedSol: body.amountSol,
          },
        });

        contributionCreatorId = updatedCreator.id;
      }
    }

    if (contributionChallengeId || contributionLiveId || contributionCreatorId) {
      await prisma.contribution.update({
        where: { id: createdContribution.id },
        data: {
          ...(contributionChallengeId ? { challengeId: contributionChallengeId } : {}),
          ...(contributionLiveId ? { liveId: contributionLiveId } : {}),
          ...(contributionCreatorId ? { challengeCreatorId: contributionCreatorId } : {}),
        },
      });
    }

    return NextResponse.json({
      contribution: {
        ...createdContribution,
        amountSol: createdContribution.amountSol.toString(),
      },
      live: updatedLive
        ? {
            ...updatedLive,
            totalCollectedSol: updatedLive.totalCollectedSol.toString(),
          }
        : null,
      challenge: updatedChallenge
        ? {
            ...updatedChallenge,
            targetMin: updatedChallenge.targetMin.toString(),
            totalCollectedSol: updatedChallenge.totalCollectedSol.toString(),
          }
        : null,
      challengeCreator: updatedCreator
        ? {
            ...updatedCreator,
            totalRaisedSol: updatedCreator.totalRaisedSol.toString(),
          }
        : null,
      pairing: pairing ? { battle: pairing } : null,
    }, { status: 201 });
  } catch (error) {
    console.error("Contribution store error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid contribution payload", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to store contribution" },
      { status: 500 }
    );
  }
}