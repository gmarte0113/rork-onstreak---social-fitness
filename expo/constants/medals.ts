import { PROGRAMS, getProgram } from "@/constants/programs";

export type MedalId = string;

export type MedalTier = "bronze" | "silver" | "gold" | "platinum" | "special";

export type Medal = {
  id: MedalId;
  title: string;
  subtitle: string;
  tier: MedalTier;
  color: string;
  bg: string;
  ring: string;
  threshold?: number;
  kind: "streak" | "program" | "personal-plan";
};

const STREAK_MEDALS: Medal[] = [
  {
    id: "streak-7",
    title: "7 Day Streak",
    subtitle: "Week one locked in",
    tier: "bronze",
    color: "#CD7F32",
    bg: "rgba(205,127,50,0.15)",
    ring: "#CD7F32",
    threshold: 7,
    kind: "streak",
  },
  {
    id: "streak-14",
    title: "14 Day Streak",
    subtitle: "Two weeks strong",
    tier: "silver",
    color: "#C0C0C8",
    bg: "rgba(192,192,200,0.15)",
    ring: "#C0C0C8",
    threshold: 14,
    kind: "streak",
  },
  {
    id: "streak-30",
    title: "30 Day Streak",
    subtitle: "A full month",
    tier: "gold",
    color: "#FFD54A",
    bg: "rgba(255,213,74,0.15)",
    ring: "#FFD54A",
    threshold: 30,
    kind: "streak",
  },
  {
    id: "streak-60",
    title: "60 Day Streak",
    subtitle: "Unstoppable",
    tier: "platinum",
    color: "#B9F2FF",
    bg: "rgba(185,242,255,0.15)",
    ring: "#B9F2FF",
    threshold: 60,
    kind: "streak",
  },
];

export const PERSONAL_PLAN_MEDAL_ID = "personal-plan";

const PERSONAL_PLAN_MEDAL: Medal = {
  id: PERSONAL_PLAN_MEDAL_ID,
  title: "Personalized Plan",
  subtitle: "Finished your tailored plan",
  tier: "special",
  color: "#FF6B35",
  bg: "rgba(255,107,53,0.15)",
  ring: "#FF6B35",
  kind: "personal-plan",
};

export function programMedalId(programId: string): string {
  return `program:${programId}`;
}

function medalForProgram(programId: string): Medal | undefined {
  const p = getProgram(programId);
  if (!p) return undefined;
  return {
    id: programMedalId(programId),
    title: `${p.title} Medal`,
    subtitle:
      p.type === "challenge"
        ? `Completed the ${p.title} challenge`
        : `Completed the ${p.title}`,
    tier: "special",
    color: p.accent,
    bg: p.accentBg,
    ring: p.accent,
    kind: "program",
  };
}

export const MEDALS: Medal[] = [
  ...STREAK_MEDALS,
  PERSONAL_PLAN_MEDAL,
  ...PROGRAMS.map((p) => medalForProgram(p.id)).filter(
    (m): m is Medal => !!m
  ),
];

export function getMedal(id: MedalId): Medal | undefined {
  const direct = MEDALS.find((m) => m.id === id);
  if (direct) return direct;
  if (id.startsWith("program:")) {
    return medalForProgram(id.slice("program:".length));
  }
  return undefined;
}

export function streakMedalsEarned(streak: number): MedalId[] {
  const out: MedalId[] = [];
  if (streak >= 7) out.push("streak-7");
  if (streak >= 14) out.push("streak-14");
  if (streak >= 30) out.push("streak-30");
  if (streak >= 60) out.push("streak-60");
  return out;
}
