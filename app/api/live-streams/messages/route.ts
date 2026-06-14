import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function ensureLiveMessagesTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "LiveMessage" (
      "id" TEXT PRIMARY KEY,
      "liveId" TEXT,
      "channelName" TEXT NOT NULL,
      "userName" TEXT,
      "displayName" TEXT,
      "text" TEXT NOT NULL,
      "isTip" BOOLEAN NOT NULL DEFAULT FALSE,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "LiveMessage_channelName_idx" ON "LiveMessage" ("channelName");
  `;
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "LiveMessage_liveId_idx" ON "LiveMessage" ("liveId");
  `;
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "LiveMessage_createdAt_idx" ON "LiveMessage" ("createdAt");
  `;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channelName = searchParams.get("channelName");

    if (!channelName || typeof channelName !== "string") {
      return NextResponse.json(
        { error: "Invalid channel name" },
        { status: 400 }
      );
    }

    await ensureLiveMessagesTable();

    const messages = await prisma.$queryRaw<Array<{
      id: string;
      userName: string | null;
      displayName: string | null;
      text: string;
      isTip: boolean;
      createdAt: string;
    }>>`
      SELECT
        "id",
        "userName",
        "displayName",
        "text",
        "isTip",
        "createdAt"
      FROM "LiveMessage"
      WHERE "channelName" = ${channelName}
      ORDER BY "createdAt" ASC
      LIMIT 100;
    `;

    return NextResponse.json({
      channelName,
      messages: messages.map((message) => ({
        ...message,
        user: message.displayName || message.userName || "Anonymous",
        timestamp: new Date(message.createdAt).getTime(),
      })),
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { channelName, userName, displayName, text, isTip } =
      await request.json();

    if (!channelName || typeof channelName !== "string") {
      return NextResponse.json(
        { error: "Invalid channel name" },
        { status: 400 }
      );
    }

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Invalid message text" },
        { status: 400 }
      );
    }

    await ensureLiveMessagesTable();

    const live = await prisma.live.findUnique({
      where: { channelName },
      select: { id: true },
    });

    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO "LiveMessage" (
        "id",
        "liveId",
        "channelName",
        "userName",
        "displayName",
        "text",
        "isTip",
        "createdAt"
      ) VALUES (
        ${id},
        ${live?.id ?? null},
        ${channelName},
        ${userName ?? null},
        ${displayName ?? null},
        ${text},
        ${Boolean(isTip)},
        ${now}
      );
    `;

    const newMessage = {
      id,
      user: displayName || userName || "Anonymous",
      userName,
      displayName,
      text,
      isTip: !!isTip,
      timestamp: now.getTime(),
    };

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error("Error posting message:", error);
    return NextResponse.json(
      { error: "Failed to post message" },
      { status: 500 }
    );
  }
}
