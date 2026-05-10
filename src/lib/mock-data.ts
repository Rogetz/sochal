// Mock data for testing - replace with real API calls later
export interface MockReel {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  creatorAvatar: string;
  videoUrl: string;
  thumbnailUrl: string;
  description: string;
  topic: string;
  likes: number;
  comments: number;
  shares: number;
  isLive: boolean;
  liveViewers?: number;
  potSol?: number;
  createdAt: Date;
}

export interface MockLiveStream {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  creatorAvatar: string;
  title: string;
  topic: string;
  viewers: number;
  tips: number;
  isActive: boolean;
}

// Mock reels for testing
export const MOCK_REELS: MockReel[] = [
  {
    id: "reel_1",
    creatorId: "user_1",
    creatorName: "Sarah Soul",
    creatorHandle: "@sarahsoul",
    creatorAvatar: "https://randomuser.me/api/portraits/women/1.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnailUrl: "https://picsum.photos/id/100/400/600",
    description: "Vocal run challenge! Can you hit this high note? 🎤 #Singing",
    topic: "Singing",
    likes: 1234,
    comments: 89,
    shares: 45,
    isLive: false,
    createdAt: new Date(),
  },
  {
    id: "reel_2",
    creatorId: "user_2",
    creatorName: "B-Boy Jay",
    creatorHandle: "@bboyjay",
    creatorAvatar: "https://randomuser.me/api/portraits/men/2.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFunflies.mp4",
    thumbnailUrl: "https://picsum.photos/id/101/400/600",
    description: "Street dance battle! Who got the best moves? 🔥 #Dancing",
    topic: "Dancing",
    likes: 3456,
    comments: 234,
    shares: 120,
    isLive: true,
    liveViewers: 234,
    potSol: 12.5,
    createdAt: new Date(),
  },
  {
    id: "reel_3",
    creatorId: "user_3",
    creatorName: "Comedy King",
    creatorHandle: "@comedyking",
    creatorAvatar: "https://randomuser.me/api/portraits/men/3.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnailUrl: "https://picsum.photos/id/102/400/600",
    description: "Best joke wins 5 SOL! Drop your best in comments 😂 #Comedy",
    topic: "Comedy",
    likes: 5678,
    comments: 567,
    shares: 234,
    isLive: false,
    createdAt: new Date(),
  },
];

// Mock live streams
export const MOCK_LIVE_STREAMS: MockLiveStream[] = [
  {
    id: "live_1",
    creatorId: "user_2",
    creatorName: "B-Boy Jay",
    creatorHandle: "@bboyjay",
    creatorAvatar: "https://randomuser.me/api/portraits/men/2.jpg",
    title: "Dance Battle Live!",
    topic: "Dancing",
    viewers: 234,
    tips: 12.5,
    isActive: true,
  },
  {
    id: "live_2",
    creatorId: "user_4",
    creatorName: "Rap Master",
    creatorHandle: "@rapmaster",
    creatorAvatar: "https://randomuser.me/api/portraits/men/4.jpg",
    title: "Freestyle Friday",
    topic: "Rap",
    viewers: 189,
    tips: 8.2,
    isActive: true,
  },
];

// Storage key for localStorage
const STORAGE_KEY = 'sochal_user_reels';

// Load user reels from localStorage
function loadUserReels(): MockReel[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      return parsed.map((reel: any) => ({
        ...reel,
        createdAt: new Date(reel.createdAt),
      }));
    } catch (e) {
      console.error('Failed to parse user reels:', e);
    }
  }
  return [];
}

// Save user reels to localStorage
function saveUserReels(reels: MockReel[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reels));
}

// Initialize userReels from localStorage
let userReels: MockReel[] = loadUserReels();

export function addUserReel(reel: Omit<MockReel, "id" | "likes" | "comments" | "shares" | "createdAt">): MockReel {
  const newReel: MockReel = {
    ...reel,
    id: `user_reel_${Date.now()}`,
    likes: 0,
    comments: 0,
    shares: 0,
    createdAt: new Date(),
  };
  userReels.unshift(newReel);
  saveUserReels(userReels);
  return newReel;
}

export function getAllReels(): MockReel[] {
  return [...userReels, ...MOCK_REELS];
}

export function getUserReels(userId: string): MockReel[] {
  const allUserReels = [...userReels.filter(r => r.creatorId === userId), ...MOCK_REELS.filter(r => r.creatorId === userId)];
  return allUserReels;
}

// Helper function to clear all user reels (for testing)
export function clearUserReels(): void {
  userReels = [];
  saveUserReels(userReels);
}

// Helper function to get user reel count
export function getUserReelCount(userId: string): number {
  return getUserReels(userId).length;
}