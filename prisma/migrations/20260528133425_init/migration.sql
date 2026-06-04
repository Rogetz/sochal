-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT NOT NULL,
    "handle" TEXT,
    "displayName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "onChainAddress" TEXT,
    "creatorWalletAddress" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetMin" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "currentStage" TEXT NOT NULL DEFAULT 'ROUND_OF_32',
    "maxCreators" INTEGER NOT NULL DEFAULT 32,
    "totalCollectedSol" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Challenge_creatorWalletAddress_fkey" FOREIGN KEY ("creatorWalletAddress") REFERENCES "User" ("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Live" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "streamId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "onChainAddress" TEXT,
    "ownerWalletAddress" TEXT NOT NULL,
    "challengeId" TEXT,
    "topic" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetSol" DECIMAL NOT NULL DEFAULT 0,
    "totalCollectedSol" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Live_ownerWalletAddress_fkey" FOREIGN KEY ("ownerWalletAddress") REFERENCES "User" ("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Live_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChallengeCreator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "creatorWalletAddress" TEXT NOT NULL,
    "liveStreamId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stage" TEXT NOT NULL DEFAULT 'ROUND_OF_32',
    "totalRaisedSol" DECIMAL NOT NULL DEFAULT 0,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualifiedAt" DATETIME,
    "eliminatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChallengeCreator_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChallengeCreator_creatorWalletAddress_fkey" FOREIGN KEY ("creatorWalletAddress") REFERENCES "User" ("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChallengeCreator_liveStreamId_fkey" FOREIGN KEY ("liveStreamId") REFERENCES "Live" ("streamId") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "txSignature" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "fanWalletAddress" TEXT NOT NULL,
    "amountSol" DECIMAL NOT NULL,
    "blockTime" INTEGER,
    "liveId" TEXT,
    "challengeId" TEXT,
    "challengeCreatorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contribution_fanWalletAddress_fkey" FOREIGN KEY ("fanWalletAddress") REFERENCES "User" ("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contribution_liveId_fkey" FOREIGN KEY ("liveId") REFERENCES "Live" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contribution_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contribution_challengeCreatorId_fkey" FOREIGN KEY ("challengeCreatorId") REFERENCES "ChallengeCreator" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChallengeBattle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "creatorALiveId" TEXT NOT NULL,
    "creatorBLiveId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "pairedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "winnerLiveId" TEXT,
    CONSTRAINT "ChallengeBattle_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChallengeBattle_creatorALiveId_fkey" FOREIGN KEY ("creatorALiveId") REFERENCES "Live" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChallengeBattle_creatorBLiveId_fkey" FOREIGN KEY ("creatorBLiveId") REFERENCES "Live" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChallengeBattle_winnerLiveId_fkey" FOREIGN KEY ("winnerLiveId") REFERENCES "Live" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_onChainAddress_key" ON "Challenge"("onChainAddress");

-- CreateIndex
CREATE INDEX "Challenge_creatorWalletAddress_idx" ON "Challenge"("creatorWalletAddress");

-- CreateIndex
CREATE INDEX "Challenge_topic_idx" ON "Challenge"("topic");

-- CreateIndex
CREATE UNIQUE INDEX "Live_streamId_key" ON "Live"("streamId");

-- CreateIndex
CREATE UNIQUE INDEX "Live_channelName_key" ON "Live"("channelName");

-- CreateIndex
CREATE UNIQUE INDEX "Live_onChainAddress_key" ON "Live"("onChainAddress");

-- CreateIndex
CREATE INDEX "Live_ownerWalletAddress_idx" ON "Live"("ownerWalletAddress");

-- CreateIndex
CREATE INDEX "Live_challengeId_idx" ON "Live"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeCreator_liveStreamId_key" ON "ChallengeCreator"("liveStreamId");

-- CreateIndex
CREATE INDEX "ChallengeCreator_challengeId_status_idx" ON "ChallengeCreator"("challengeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeCreator_challengeId_creatorWalletAddress_key" ON "ChallengeCreator"("challengeId", "creatorWalletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_txSignature_key" ON "Contribution"("txSignature");

-- CreateIndex
CREATE INDEX "Contribution_scope_fanWalletAddress_idx" ON "Contribution"("scope", "fanWalletAddress");

-- CreateIndex
CREATE INDEX "Contribution_liveId_idx" ON "Contribution"("liveId");

-- CreateIndex
CREATE INDEX "Contribution_challengeId_idx" ON "Contribution"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeBattle_creatorALiveId_key" ON "ChallengeBattle"("creatorALiveId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeBattle_creatorBLiveId_key" ON "ChallengeBattle"("creatorBLiveId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeBattle_winnerLiveId_key" ON "ChallengeBattle"("winnerLiveId");

-- CreateIndex
CREATE INDEX "ChallengeBattle_challengeId_status_idx" ON "ChallengeBattle"("challengeId", "status");

-- CreateIndex
CREATE INDEX "ChallengeBattle_creatorALiveId_creatorBLiveId_idx" ON "ChallengeBattle"("creatorALiveId", "creatorBLiveId");
