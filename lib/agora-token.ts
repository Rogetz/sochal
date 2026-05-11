// lib/agora-token.ts
import { RtcRole, RtcTokenBuilder } from "agora-access-token";

const APP_ID = "2b3d14dc607a41058d1e7ecafb586544";
const APP_CERTIFICATE = "dd43d515500a44feb23362a69b3e2da3";

export function buildRtcToken(channelName: string, uid: number, role: RtcRole): string {
  // Token expiration time (24 hours)
  const expirationTimeInSeconds = 24 * 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  return RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );
}