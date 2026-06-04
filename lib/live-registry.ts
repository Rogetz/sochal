import type { LiveStream } from "./sochal-store";

export type LiveStreamRecord = LiveStream & {
  channelName: string;
  onChainAddress?: string;
  challengeId?: string;
  updatedAt: number;
};

type LiveRegistryStore = Map<string, LiveStreamRecord>;

const REGISTRY_KEY = "__sochalLiveRegistry";

function getRegistry(): LiveRegistryStore {
  const globalState = globalThis as Record<string, unknown>;
  const existing = globalState[REGISTRY_KEY] as LiveRegistryStore | undefined;

  if (existing) {
    return existing;
  }

  const registry = new Map<string, LiveStreamRecord>();
  globalState[REGISTRY_KEY] = registry;
  return registry;
}

export const liveRegistry = getRegistry();

export function cleanStaleLiveRecords(staleAfterMs = 45_000): void {
  const now = Date.now();

  for (const [key, value] of liveRegistry.entries()) {
    if (now - value.updatedAt > staleAfterMs) {
      liveRegistry.delete(key);
    }
  }
}

export function getLiveRecord(channelName: string): LiveStreamRecord | undefined {
  return liveRegistry.get(channelName);
}

export function listLiveRecords(): LiveStreamRecord[] {
  return Array.from(liveRegistry.values());
}

export function upsertLiveRecord(record: Omit<LiveStreamRecord, "updatedAt">): LiveStreamRecord {
  const next = {
    ...record,
    updatedAt: Date.now(),
  } satisfies LiveStreamRecord;

  liveRegistry.set(record.channelName, next);
  return next;
}

export function updateLiveRecord(
  channelName: string,
  updates: Partial<Omit<LiveStreamRecord, "channelName" | "startedAt">>,
): LiveStreamRecord | null {
  const existing = liveRegistry.get(channelName);

  if (!existing) {
    return null;
  }

  const next = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  } satisfies LiveStreamRecord;

  liveRegistry.set(channelName, next);
  return next;
}

export function deleteLiveRecord(channelName: string): boolean {
  return liveRegistry.delete(channelName);
}