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
  streak1: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/o788fvgb34ocqc79ho8v5.png",
  streak7: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/jzcnmsoh6pmyi3q4u1zn4.png",
  streak14: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/6j8xkxjswa4anzom63vcc.png",
  day30: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/dnvgeq7abji6ebvf35i0k.png",
  dailyStarter: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/8ayf2l8xidzdcgfl8yes9.png",
  personalPlan: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/geigsyw5r62fsswdwmes0.png",
  challenge14: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/53u071s7k8nr3m6nfc5ao.png",
  challenge21: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/j9s68tm8dkusy0s3picxe.png",
  day90: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/91vagbspayi1xck7djv9f.png",
  weightLossPlan: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/gjxu4urjeqy5lr9op72rg.png",
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
