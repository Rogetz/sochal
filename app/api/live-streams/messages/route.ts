import { NextResponse } from "next/server";

// In-memory store for messages per channel (replace with DB for production)
const channelMessages: Map<string, any[]> = new Map();

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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

    const messages = channelMessages.get(channelName) || [];

    return NextResponse.json({
      channelName,
      messages,
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

    // Get or create message array for this channel
    if (!channelMessages.has(channelName)) {
      channelMessages.set(channelName, []);
    }

    const messages = channelMessages.get(channelName)!;

    const newMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      user: displayName || userName || "Anonymous",
      userName,
      text,
      isTip: !!isTip,
      timestamp: Date.now(),
    };

    messages.push(newMessage);

    // Keep only the last 100 messages to avoid memory bloat
    if (messages.length > 100) {
      messages.shift();
    }

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
