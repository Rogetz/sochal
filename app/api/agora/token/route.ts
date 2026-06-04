import { NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole } from "agora-access-token";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  try {
    // Validate environment variables
    if (!APP_ID || !APP_CERTIFICATE) {
      console.error("Missing Agora credentials");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const {channelName, uid, role } = await request.json();

      // Validate input
      if (!channelName || typeof channelName !== "string") {
      return NextResponse.json(
        { error: "Invalid channel name" },
        { status: 400 }
      );
    }

      // role validation
      if (role !== "host" && role !== "audience") {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

      // This endpoint is intentionally UID-only to avoid identity mode mismatches.
      const usingUid = typeof uid === "number" && Number.isInteger(uid) && uid > 0;

      if (!usingUid) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
      }

    // Token expiration: 24 hours
    const expirationTimeInSeconds = 3600 * 24;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Determine RTC role
    const rtcRole = role === "host" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    // Generate token using either a userAccount (string) or numeric uid
    let token: string | null = null;

    token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      rtcRole,
      privilegeExpiredTs
    );

    if (!token) throw new Error("Token generation failed");

    return NextResponse.json({
      token,
      uid,
      userAccount: null,
      channelName,
      appId: APP_ID,
    });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}