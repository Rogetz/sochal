// lib/stream-sharing.ts
// Utility functions for sharing streams remotely

export interface ShareableStream {
  channelName: string;
  hostName: string;
  url: string;
  qrCode?: string;
  viewers?: number;
}

/**
 * Generate a shareable stream URL
 */
export const generateStreamShareURL = (
  channelName: string,
  baseUrl?: string
): string => {
  const url = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${url}/live/${channelName}`;
};

/**
 * Generate a stream share link with metadata
 */
export const generateStreamShareLink = (
  channelName: string,
  hostName: string,
  baseUrl?: string
): ShareableStream => {
  const url = generateStreamShareURL(channelName, baseUrl);
  return {
    channelName,
    hostName,
    url,
  };
};

/**
 * Copy stream URL to clipboard
 */
export const copyStreamToClipboard = async (
  channelName: string
): Promise<boolean> => {
  try {
    const url = generateStreamShareURL(channelName);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error("Failed to copy stream URL:", error);
    return false;
  }
};

/**
 * Generate shareable text for the stream
 */
export const generateStreamShareText = (
  hostName: string,
  channelName: string
): string => {
  const url = generateStreamShareURL(channelName);
  return `${hostName} is streaming live! Join at: ${url}`;
};

/**
 * Build share links for different platforms
 */
export const generatePlatformShareLinks = (
  hostName: string,
  channelName: string,
  baseUrl?: string
) => {
  const url = generateStreamShareURL(channelName, baseUrl);
  const text = generateStreamShareText(hostName, channelName);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    whatsapp: `https://wa.me/?text=${encodedText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    copy: () => copyStreamToClipboard(channelName),
  };
};

/**
 * Validate if a stream is still accessible
 */
export const isStreamAccessible = async (channelName: string): Promise<boolean> => {
  try {
    // Check if stream info is available in streaming service
    const { streamingService } = await import("./streaming-service");
    return streamingService.isStreamActive(channelName);
  } catch (error) {
    console.error("Error checking stream accessibility:", error);
    return false;
  }
};

/**
 * Get stream join link (for joining a specific stream)
 */
export const getStreamJoinLink = (
  channelName: string,
  role: "host" | "audience" = "audience"
): string => {
  const url = generateStreamShareURL(channelName);
  return `${url}?role=${role}`;
};

/**
 * Format viewer count for display
 */
export const formatViewerCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};
