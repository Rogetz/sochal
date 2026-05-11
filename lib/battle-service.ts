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

// Queue of creators waiting for battle
let waitingQueue: Array<{
  walletAddress: string;
  handle: string;
  displayName: string;
  avatar: string;
  topic: string;
  battleId: string;
  targetSol: number;
  currentSol: number;
  title: string;
}> = [];

// Active battles
let activeBattles: Map<string, Battle> = new Map();

// Check if a creator's target is reached and they should be queued
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
  // Only queue if target is reached and not already in queue
  const alreadyInQueue = waitingQueue.some(q => q.walletAddress === walletAddress);
  const alreadyInBattle = Array.from(activeBattles.values()).some(
    b => b.creatorA === walletAddress || b.creatorB === walletAddress
  );
  
  if (currentSol >= targetSol && !alreadyInQueue && !alreadyInBattle) {
    // Add to waiting queue
    waitingQueue.push({
      walletAddress,
      handle,
      displayName,
      avatar,
      topic,
      battleId: streamId,
      targetSol,
      currentSol,
      title
    });
    
    console.log(`[Matchmaking] ${displayName} added to queue. Queue size: ${waitingQueue.length}`);
    
    // Try to find a match
    return tryMatchCreators();
  }
  
  return null;
}

// Try to match two creators
function tryMatchCreators(): Battle | null {
  if (waitingQueue.length < 2) {
    return null;
  }
  
  // Get first two from queue
  const creator1 = waitingQueue.shift()!;
  const creator2 = waitingQueue.shift()!;
  
  // Same topic check
  if (creator1.topic !== creator2.topic) {
    // Put back and try different match? For now, just return null
    waitingQueue.unshift(creator1);
    return null;
  }
  
  // Calculate combined target
  const combinedTarget = (creator1.targetSol + creator2.targetSol) / 2;
  
  // Create battle
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
    title: `Battle: ${creator1.title} vs ${creator2.title}`,
    targetSol: combinedTarget,
    currentSol: creator1.currentSol + creator2.currentSol,
    tipsA: creator1.currentSol,
    tipsB: creator2.currentSol,
    status: "active",
    winner: null,
    winnerHandle: null,
    startedAt: new Date(),
    pairedAt: new Date(),
    endedAt: null,
    viewersA: 0,
    viewersB: 0
  };
  
  activeBattles.set(battle.id, battle);
  console.log(`[Matchmaking] Battle created: ${creator1.displayName} vs ${creator2.displayName}`);
  
  return battle;
}

// Update tips during battle
export function updateBattleTips(
  battleId: string,
  creatorWallet: string,
  amount: number
): Battle | null {
  const battle = activeBattles.get(battleId);
  if (!battle || battle.status !== "active") return null;
  
  if (battle.creatorA === creatorWallet) {
    battle.tipsA += amount;
  } else if (battle.creatorB === creatorWallet) {
    battle.tipsB += amount;
  }
  
  battle.currentSol += amount;
  activeBattles.set(battleId, battle);
  
  // Check if battle should end (time based or tip threshold)
  const battleAge = Date.now() - battle.pairedAt!.getTime();
  const battleDurationMs = 5 * 60 * 1000; // 5 minutes max
  
  if (battleAge >= battleDurationMs) {
    return endBattle(battleId);
  }
  
  return battle;
}

// End battle and determine winner
export function endBattle(battleId: string): Battle | null {
  const battle = activeBattles.get(battleId);
  if (!battle) return null;
  
  battle.status = "completed";
  battle.endedAt = new Date();
  
  // Determine winner by tips
  if (battle.tipsA > battle.tipsB) {
    battle.winner = battle.creatorA;
    battle.winnerHandle = battle.creatorAHandle;
  } else if (battle.tipsB > battle.tipsA) {
    battle.winner = battle.creatorB;
    battle.winnerHandle = battle.creatorBHandle;
  } else {
    // Tie - no winner
    battle.winner = null;
    battle.winnerHandle = null;
  }
  
  console.log(`[Matchmaking] Battle ended! Winner: ${battle.winnerHandle || "Tie"}`);
  
  return battle;
}

// Get active battle for a creator
export function getActiveBattleForCreator(walletAddress: string): Battle | null {
  return Array.from(activeBattles.values()).find(
    b => (b.creatorA === walletAddress || b.creatorB === walletAddress) && b.status === "active"
  ) || null;
}

// Get battle by ID
export function getBattleById(battleId: string): Battle | null {
  return activeBattles.get(battleId) || null;
}

// Remove from queue (if creator cancels)
export function removeFromQueue(walletAddress: string): void {
  waitingQueue = waitingQueue.filter(q => q.walletAddress !== walletAddress);
}

// Update stream pot (called when tips come in)
export function updateStreamPot(
  streamId: string,
  walletAddress: string,
  currentPot: number,
  targetSol: number
): Battle | null {
  // Check if this triggers matchmaking
  return checkAndQueueForBattle(streamId, walletAddress, currentPot, targetSol);
}

async function checkAndQueueForBattle(
  streamId: string,
  walletAddress: string,
  currentPot: number,
  targetSol: number
): Promise<Battle | null> {
  // This would need profile info - in practice, you'd pass it
  return null;
}