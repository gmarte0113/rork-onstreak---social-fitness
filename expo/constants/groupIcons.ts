export type GroupIcon = {
  emoji: string;
  unlockAt: number;
  special?: boolean;
};

export const GROUP_ICONS: GroupIcon[] = [
  { emoji: "🔥", unlockAt: 0 },
  { emoji: "💪", unlockAt: 0 },
  { emoji: "⚡", unlockAt: 0 },
  { emoji: "🏆", unlockAt: 0 },
  { emoji: "🎯", unlockAt: 0 },

  { emoji: "🚀", unlockAt: 25 },
  { emoji: "🧘", unlockAt: 25 },
  { emoji: "🏃", unlockAt: 25 },
  { emoji: "🥊", unlockAt: 25 },
  { emoji: "🤩", unlockAt: 25 },

  { emoji: "💎", unlockAt: 50 },
  { emoji: "⭐", unlockAt: 50 },
  { emoji: "🌱", unlockAt: 50 },
  { emoji: "🌊", unlockAt: 50 },
  { emoji: "🌟", unlockAt: 50 },

  { emoji: "🐺", unlockAt: 75 },
  { emoji: "🦁", unlockAt: 75 },
  { emoji: "🦅", unlockAt: 75 },
  { emoji: "🐉", unlockAt: 75 },
  { emoji: "🦈", unlockAt: 75 },

  { emoji: "👑", unlockAt: 100 },
  { emoji: "🌋", unlockAt: 100 },
  { emoji: "⚔️", unlockAt: 100 },
  { emoji: "🛡️", unlockAt: 100 },
  { emoji: "🏅", unlockAt: 100 },

  { emoji: "🪐", unlockAt: 500, special: true },
];

export const MAX_GROUP_MEMBERS = 5;

export function isIconUnlocked(icon: GroupIcon, groupStreak: number): boolean {
  return groupStreak >= icon.unlockAt;
}
