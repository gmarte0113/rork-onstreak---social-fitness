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
  image: string;
};

export const MEDAL_IMAGES = {
  streak1: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/kbhstbsrkt5ifrtk2c9p7.png",
  streak7: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/cynpmyezte78wgxih7pej.png",
  challenge14: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/t06vdpv29i1x8xm32ck41.png",
  streak14: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/tczwkcexsdhvyh9mnkmt7.png",
  challenge21: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/pgl5xjstep60j6bc7ct75.png",
  day30: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/mp5q0cixcgg0y98ih96jd.png",
  day90: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/all1r3mim1uq3jorkakei.png",
  dailyStarter: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/m9mn2db6g7qegcfri4uuq.png",
  personalPlan: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ye9pt0icypq9b0gugut1r.png",
  weightLossPlan: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/2ryopd62anexo4yd5dk3j.png",
} as const;

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
    image: MEDAL_IMAGES.streak7,
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
    image: MEDAL_IMAGES.streak14,
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
    image: MEDAL_IMAGES.day30,
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
    image: MEDAL_IMAGES.day90,
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
  image: MEDAL_IMAGES.personalPlan,
};

function imageForProgram(programId: string, isChallenge: boolean): string {
  if (programId === "daily-starter") return MEDAL_IMAGES.dailyStarter;
  if (programId === "weight-loss-60") return MEDAL_IMAGES.weightLossPlan;
  if (programId === "transformation-90") return MEDAL_IMAGES.day90;
  if (programId === "abs-30") return MEDAL_IMAGES.day30;
  if (programId === "legs-21") return MEDAL_IMAGES.challenge21;
  if (programId === "reset-14") return MEDAL_IMAGES.challenge14;
  if (programId === "lean-muscle-45") return MEDAL_IMAGES.personalPlan;
  if (programId === "stay-active-30") return MEDAL_IMAGES.dailyStarter;
  return isChallenge ? MEDAL_IMAGES.challenge14 : MEDAL_IMAGES.personalPlan;
}

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
    image: imageForProgram(programId, p.type === "challenge"),
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
