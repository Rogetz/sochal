// lib/streaming-service.ts
// Service to manage remote streaming and channel coordination

export interface StreamSession {
  channelName: string;
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  startedAt: number;
  viewers: number;
  title?: string;
  topic?: string;
}

interface StreamListener {
  onViewersUpdated?: (viewers: number) => void;
  onHostDisconnected?: () => void;
  onError?: (error: string) => void;
}

class StreamingService {
  private activeSessions: Map<string, StreamSession> = new Map();
  private listeners: Map<string, StreamListener[]> = new Map();
  private storageKey = "active_streams";

  /**
   * Start a new streaming session
   */
  startStream(session: StreamSession): void {
    this.activeSessions.set(session.channelName, session);
    this.persistSessions();
    console.log(`Stream started: ${session.channelName} by ${session.hostName}`);
  }

  /**
   * End a streaming session
   */
  endStream(channelName: string): void {
    this.activeSessions.delete(channelName);
    this.persistSessions();
    this.notifyListeners(channelName, "onHostDisconnected");
    console.log(`Stream ended: ${channelName}`);
  }

  /**
   * Update viewer count for a channel
   */
  updateViewers(channelName: string, viewerCount: number): void {
    const session = this.activeSessions.get(channelName);
    if (session) {
      session.viewers = viewerCount;
      this.persistSessions();
      this.notifyListeners(channelName, "onViewersUpdated", viewerCount);
    }
  }

  /**
   * Get active stream session by channel name
   */
  getSession(channelName: string): StreamSession | undefined {
    return this.activeSessions.get(channelName);
  }

  /**
   * Get all active streams
   */
  getAllSessions(): StreamSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Check if a stream is active
   */
  isStreamActive(channelName: string): boolean {
    return this.activeSessions.has(channelName);
  }

  /**
   * Register listener for channel events
   */
  subscribe(
    channelName: string,
    listener: StreamListener
  ): () => void {
    if (!this.listeners.has(channelName)) {
      this.listeners.set(channelName, []);
    }

    this.listeners.get(channelName)!.push(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(channelName);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Notify listeners of events
   */
  private notifyListeners(
    channelName: string,
    eventType: keyof StreamListener,
    data?: any
  ): void {
    const listeners = this.listeners.get(channelName);
    if (listeners) {
      listeners.forEach((listener) => {
        const callback = listener[eventType] as any;
        if (typeof callback === "function") {
          callback(data);
        }
      });
    }
  }

  /**
   * Persist active sessions to localStorage
   */
  private persistSessions(): void {
    try {
      if (typeof window !== "undefined") {
        const sessions = Array.from(this.activeSessions.values());
        window.localStorage.setItem(this.storageKey, JSON.stringify(sessions));
      }
    } catch (error) {
      console.error("Error persisting sessions:", error);
    }
  }

  /**
   * Load sessions from localStorage
   */
  loadSessions(): void {
    try {
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem(this.storageKey);
        if (stored) {
          const sessions = JSON.parse(stored) as StreamSession[];
          sessions.forEach((session) => {
            // Only load recent sessions (less than 1 hour old)
            if (Date.now() - session.startedAt < 3600000) {
              this.activeSessions.set(session.channelName, session);
            }
          });
        }
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
  }

  /**
   * Clear all sessions
   */
  clearSessions(): void {
    this.activeSessions.clear();
    this.listeners.clear();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(this.storageKey);
    }
  }

  /**
   * Get stream statistics
   */
  getStats() {
    return {
      totalStreams: this.activeSessions.size,
      totalViewers: Array.from(this.activeSessions.values()).reduce(
        (sum, session) => sum + session.viewers,
        0
      ),
    };
  }
}

// Export singleton instance
export const streamingService = new StreamingService();

/**
 * Hook to monitor a specific stream
 */
export const useStreamMonitor = (channelName: string) => {
  const [viewers, setViewers] = React.useState(0);
  const [isActive, setIsActive] = React.useState(false);

  React.useEffect(() => {
    const session = streamingService.getSession(channelName);
    setIsActive(!!session);
    if (session) {
      setViewers(session.viewers);
    }

    const unsubscribe = streamingService.subscribe(channelName, {
      onViewersUpdated: (count) => setViewers(count),
      onHostDisconnected: () => setIsActive(false),
    });

    return unsubscribe;
  }, [channelName]);

  return { viewers, isActive };
};

// Add React import for hook
import React from "react";
