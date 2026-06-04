import {
  type Address,
  type OptionOrNullable,
  type ReadonlyUint8Array,
} from "@solana/kit";

// ============ ENUMS ============
export enum ChallengeStatus {
  Waiting = 0,
  Active = 1,
  Completed = 2,
  Cancelled = 3,
}

export enum UserRole {
  Fan = "fan",
  Creator = "creator",
}

export enum TopicTag {
  Singing = "singing",
  Dancing = "dancing",
  Comedy = "comedy",
  Rap = "rap",
  Beatbox = "beatbox",
  Painting = "painting",
  Magic = "magic",
  Gaming = "gaming",
  Cooking = "cooking",
  Fitness = "fitness",
}

// ============ LIVE TYPES ============
export interface TipRecordArgs {
  fan: Address;
  amount: number | bigint;
}

export interface MenuItemArgs {
  name: ReadonlyUint8Array;
  nameLen: number;
  price: number | bigint;
}

export interface LiveArgs {
  liveId: number | bigint;
  creator: Address;
  topic: string;
  totalTips: number | bigint;
  topTipper: Address;
  topTipperAmount: number | bigint;

  // FIXED
  targetReachedAt: OptionOrNullable<number | bigint>;

  closed: boolean;
  menuItems: Array<MenuItemArgs>;
  menuCount: number;
  fanTips: Array<TipRecordArgs>;
  fanCount: number;
  bump: number;
}

// ============ CHALLENGE TYPES ============
export interface ChallengeTipArgs {
  fan: Address;
  aTip: number | bigint;
  bTip: number | bigint;
}

export interface ChallengeArgs {
  tournamentGroup: Address;
  round: number;
  pairIndex: number;

  creatorA: Address;
  creatorB: Address;

  status: ChallengeStatus;

  targetMin: number | bigint;

  aTotal: number | bigint;
  bTotal: number | bigint;

  topTipper: Address;
  topTipperAmount: number | bigint;

  // FIXED HERE
  targetReachedAt: OptionOrNullable<number | bigint>;

  // THIS ONE WAS ALREADY CORRECT
  winner: OptionOrNullable<Address>;

  fanTips: Array<ChallengeTipArgs>;
  fanCount: number;

  bump: number;
}

// ============ MOCK TYPES FOR UI ============
export interface MockChallenge {
  id: string;
  topic: TopicTag;

  title: string;
  description: string;

  creatorCount: number;
  totalPrizePool: number;

  thumbnailUrl: string;

  activeLives: Array<MockLive>;

  createdAt: Date;
  endsAt: Date;
}

export interface MockLive {
  liveId: string;

  creatorName: string;
  creatorHandle: string;
  creatorAvatar: string;

  currentTips: number;
  viewerCount: number;

  isActive: boolean;
}