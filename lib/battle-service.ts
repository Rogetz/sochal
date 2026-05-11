// lib/battle-service.ts

export interface Battle {
  id: string;
  creatorA: string;
  creatorAHandle: string;
  creatorAName: string;
  creatorAAvatar: string;

  creatorB: string | null;
  creatorBHandle: string | null;
  creatorBName: string | null;
  creatorBAvatar: string | null;

  topic: string;
  title: string;

  targetSol: number;
  currentSol: number;

  tipsA: number;
  tipsB: number;

  status: "waiting" | "matching" | "active" | "completed";

  winner: string | null;
  winnerHandle: string | null;

  startedAt: Date;
  pairedAt: Date | null;
  endedAt: Date | null;

  viewersA: number;
  viewersB: number;
}

type WaitingCreator = {
  walletAddress: string;
  handle: string;
  displayName: string;
  avatar: string;
  topic: string;
  battleId: string;
  targetSol: number;
  currentSol: number;
  title: string;
};

// ======================================
// STATE
// ======================================

let waitingQueue: WaitingCreator[] = [];

let activeBattles: Map<string, Battle> = new Map();

// ======================================
// CREATE / QUEUE CREATOR
// ======================================

export function checkAndQueueCreator(
  streamId: string,
  walletAddress: string,
  handle: string,
  displayName: string,
  avatar: string,
  topic: string,
  title: string,
  targetSol: number,
  currentSol: number
): Battle | null {
  const alreadyInQueue = waitingQueue.some(
    (q) => q.walletAddress === walletAddress
  );

  const alreadyInBattle = Array.from(activeBattles.values()).some(
    (battle) =>
      battle.creatorA === walletAddress ||
      battle.creatorB === walletAddress
  );

  if (
    currentSol >= targetSol &&
    !alreadyInQueue &&
    !alreadyInBattle
  ) {
    waitingQueue.push({
      walletAddress,
      handle,
      displayName,
      avatar,
      topic,
      battleId: streamId,
      targetSol,
      currentSol,
      title,
    });

    console.log(
      `[Matchmaking] ${displayName} added to queue`
    );

    return tryMatchCreators();
  }

  return null;
}

// ======================================
// MATCH CREATORS
// ======================================

function tryMatchCreators(): Battle | null {
  if (waitingQueue.length < 2) {
    return null;
  }

  const creator1 = waitingQueue.shift();
  const creator2 = waitingQueue.shift();

  if (!creator1 || !creator2) {
    return null;
  }

  // same topic matchmaking
  if (creator1.topic !== creator2.topic) {
    waitingQueue.unshift(creator1);
    waitingQueue.unshift(creator2);

    return null;
  }

  const combinedTarget =
    (creator1.targetSol + creator2.targetSol) / 2;

  const battle: Battle = {
    id: `battle_${Date.now()}`,

    creatorA: creator1.walletAddress,
    creatorAHandle: creator1.handle,
    creatorAName: creator1.displayName,
    creatorAAvatar: creator1.avatar,

    creatorB: creator2.walletAddress,
    creatorBHandle: creator2.handle,
    creatorBName: creator2.displayName,
    creatorBAvatar: creator2.avatar,

    topic: creator1.topic,
    title: `${creator1.title} VS ${creator2.title}`,

    targetSol: combinedTarget,
    currentSol:
      creator1.currentSol + creator2.currentSol,

    tipsA: creator1.currentSol,
    tipsB: creator2.currentSol,

    status: "active",

    winner: null,
    winnerHandle: null,

    startedAt: new Date(),
    pairedAt: new Date(),
    endedAt: null,

    viewersA: 0,
    viewersB: 0,
  };

  activeBattles.set(battle.id, battle);

  console.log(
    `[Matchmaking] Battle started between ${creator1.displayName} and ${creator2.displayName}`
  );

  return battle;
}

// ======================================
// UPDATE BATTLE TIPS
// ======================================

export function updateBattleTips(
  battleId: string,
  creatorWallet: string,
  amount: number
): Battle | null {
  const battle = activeBattles.get(battleId);

  if (!battle || battle.status !== "active") {
    return null;
  }

  if (battle.creatorA === creatorWallet) {
    battle.tipsA += amount;
  }

  if (battle.creatorB === creatorWallet) {
    battle.tipsB += amount;
  }

  battle.currentSol += amount;

  activeBattles.set(battleId, battle);

  const duration =
    Date.now() - (battle.pairedAt?.getTime() || 0);

  const maxDuration = 5 * 60 * 1000;

  if (duration >= maxDuration) {
    return endBattle(battleId);
  }

  return battle;
}

// ======================================
// END BATTLE
// ======================================

export function endBattle(
  battleId: string
): Battle | null {
  const battle = activeBattles.get(battleId);

  if (!battle) {
    return null;
  }

  battle.status = "completed";
  battle.endedAt = new Date();

  if (battle.tipsA > battle.tipsB) {
    battle.winner = battle.creatorA;
    battle.winnerHandle = battle.creatorAHandle;
  } else if (battle.tipsB > battle.tipsA) {
    battle.winner = battle.creatorB;
    battle.winnerHandle = battle.creatorBHandle;
  } else {
    battle.winner = null;
    battle.winnerHandle = null;
  }

  activeBattles.set(battleId, battle);

  console.log(
    `[Battle Ended] Winner: ${battle.winnerHandle || "Tie"}`
  );

  return battle;
}

// ======================================
// GET ACTIVE BATTLE
// ======================================

export function getActiveBattleForCreator(
  walletAddress: string
): Battle | null {
  return (
    Array.from(activeBattles.values()).find(
      (battle) =>
        (battle.creatorA === walletAddress ||
          battle.creatorB === walletAddress) &&
        battle.status === "active"
    ) || null
  );
}

// ======================================
// GET BATTLE BY ID
// ======================================

export function getBattleById(
  battleId: string
): Battle | null {
  return activeBattles.get(battleId) || null;
}

// ======================================
// REMOVE FROM QUEUE
// ======================================

export function removeFromQueue(
  walletAddress: string
): void {
  waitingQueue = waitingQueue.filter(
    (q) => q.walletAddress !== walletAddress
  );
}

// ======================================
// UPDATE STREAM POT
// ======================================

export function updateStreamPot(
  streamId: string,
  walletAddress: string,
  currentPot: number,
  targetSol: number
): Battle | null {
  return checkAndQueueForBattle(
    streamId,
    walletAddress,
    currentPot,
    targetSol
  );
}

// ======================================
// INTERNAL MATCHMAKING CHECK
// ======================================

function checkAndQueueForBattle(
  streamId: string,
  walletAddress: string,
  currentPot: number,
  targetSol: number
): Battle | null {

  // placeholder implementation

  console.log(
    "[Battle Check]",
    streamId,
    walletAddress,
    currentPot,
    targetSol
  );

  return null;
}