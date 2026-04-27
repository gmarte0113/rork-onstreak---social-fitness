export type FocusArea = "abs" | "arms" | "legs" | "full_body";

export const FOCUS_LABELS: Record<FocusArea, string> = {
  abs: "Abs",
  arms: "Arms",
  legs: "Legs",
  full_body: "Full Body",
};

export const FOCUS_DESCRIPTIONS: Record<FocusArea, string> = {
  abs: "Core strength & definition",
  arms: "Upper body pressing power",
  legs: "Lower body strength",
  full_body: "Balanced total-body work",
};

export const PLAN_DURATION_DAYS = 60;

export type PlanDay = {
  day: number;
  title: string;
  durationMinutes: number;
  exercises: { name: string; reps: string }[];
  focus: FocusArea;
};

function ramp(start: number, end: number, day: number, total: number): number {
  const t = (day - 1) / Math.max(1, total - 1);
  return Math.round(start + (end - start) * t);
}

type Builder = (d: number, total: number) => Omit<PlanDay, "day" | "focus">;

const ABS_ROTATIONS: Builder[] = [
  (d, t) => ({
    title: "Core Crunch",
    durationMinutes: 4,
    exercises: [
      { name: "Crunches", reps: `${ramp(15, 40, d, t)} reps` },
      { name: "Plank", reps: `${ramp(20, 60, d, t)} seconds` },
    ],
  }),
  (d, t) => ({
    title: "Ab Sculpt",
    durationMinutes: 5,
    exercises: [
      { name: "Bicycle Crunches", reps: `${ramp(20, 50, d, t)} reps` },
      { name: "Leg Raises", reps: `${ramp(10, 25, d, t)} reps` },
    ],
  }),
  (d, t) => ({
    title: "Core Power",
    durationMinutes: 5,
    exercises: [
      { name: "Sit-ups", reps: `${ramp(15, 35, d, t)} reps` },
      { name: "Russian Twists", reps: `${ramp(20, 50, d, t)} reps` },
      { name: "Plank", reps: `${ramp(30, 75, d, t)} seconds` },
    ],
  }),
];

const ARMS_ROTATIONS: Builder[] = [
  (d, t) => ({
    title: "Push Focus",
    durationMinutes: 5,
    exercises: [
      { name: "Pushups", reps: `${ramp(10, 28, d, t)} reps` },
      { name: "Knee Pushups", reps: `${ramp(10, 20, d, t)} reps` },
    ],
  }),
  (d, t) => ({
    title: "Arm Burn",
    durationMinutes: 5,
    exercises: [
      { name: "Tricep Dips", reps: `${ramp(8, 20, d, t)} reps` },
      { name: "Arm Circles", reps: `${ramp(20, 45, d, t)} reps` },
    ],
  }),
  (d, t) => ({
    title: "Upper Strength",
    durationMinutes: 6,
    exercises: [
      { name: "Pushups", reps: `${ramp(12, 25, d, t)} reps` },
      { name: "Plank", reps: `${ramp(30, 75, d, t)} seconds` },
    ],
  }),
];

const LEGS_ROTATIONS: Builder[] = [
  (d, t) => ({
    title: "Squat Day",
    durationMinutes: 5,
    exercises: [
      { name: "Bodyweight Squats", reps: `${ramp(20, 50, d, t)} reps` },
      { name: "Calf Raises", reps: `${ramp(15, 30, d, t)} reps` },
    ],
  }),
  (d, t) => ({
    title: "Lunge Flow",
    durationMinutes: 6,
    exercises: [
      { name: "Forward Lunges", reps: `${ramp(10, 22, d, t)} each leg` },
      { name: "Glute Bridges", reps: `${ramp(15, 30, d, t)} reps` },
    ],
  }),
  (d, t) => ({
    title: "Leg Power",
    durationMinutes: 6,
    exercises: [
      { name: "Jump Squats", reps: `${ramp(10, 25, d, t)} reps` },
      { name: "Wall Sit", reps: `${ramp(30, 75, d, t)} seconds` },
    ],
  }),
];

const FULL_BODY_ROTATIONS: Builder[] = [
  (d, t) => ({
    title: "Total Body",
    durationMinutes: 7,
    exercises: [
      { name: "Bodyweight Squats", reps: `${ramp(15, 35, d, t)} reps` },
      { name: "Pushups", reps: `${ramp(8, 20, d, t)} reps` },
      { name: "Crunches", reps: `${ramp(15, 30, d, t)} reps` },
    ],
  }),
  (d, t) => ({
    title: "Power Flow",
    durationMinutes: 7,
    exercises: [
      { name: "Burpees", reps: `${ramp(6, 16, d, t)} reps` },
      { name: "Mountain Climbers", reps: `${ramp(20, 50, d, t)} reps` },
    ],
  }),
  (d, t) => ({
    title: "Cardio + Core",
    durationMinutes: 7,
    exercises: [
      { name: "Jumping Jacks", reps: `${ramp(30, 60, d, t)} reps` },
      { name: "Plank", reps: `${ramp(30, 75, d, t)} seconds` },
      { name: "Sit-ups", reps: `${ramp(15, 30, d, t)} reps` },
    ],
  }),
];

const ROTATIONS: Record<FocusArea, Builder[]> = {
  abs: ABS_ROTATIONS,
  arms: ARMS_ROTATIONS,
  legs: LEGS_ROTATIONS,
  full_body: FULL_BODY_ROTATIONS,
};

export function buildPersonalizedPlan(focusAreas: FocusArea[]): PlanDay[] {
  const areas = focusAreas.length > 0 ? focusAreas : (["full_body"] as FocusArea[]);
  const total = PLAN_DURATION_DAYS;
  const days: PlanDay[] = [];
  const counters: Record<string, number> = {};
  for (let i = 0; i < total; i++) {
    const d = i + 1;
    const focus = areas[i % areas.length];
    const key = focus;
    const count = counters[key] ?? 0;
    counters[key] = count + 1;
    const rotations = ROTATIONS[focus];
    const build = rotations[count % rotations.length];
    const base = build(d, total);
    days.push({ day: d, focus, ...base });
  }
  return days;
}

export function planName(focusAreas: FocusArea[]): string {
  if (focusAreas.length === 0) return "Personalized Plan";
  if (focusAreas.includes("full_body") && focusAreas.length === 1) {
    return "Full Body Plan";
  }
  const labels = focusAreas
    .filter((f) => f !== "full_body" || focusAreas.length === 1)
    .map((f) => FOCUS_LABELS[f]);
  const core = labels.length > 0 ? labels.join(" + ") : "Full Body";
  return `${core} Focus Plan`;
}
