export type ProgramType = "challenge" | "plan";

export type ProgramDay = {
  day: number;
  title: string;
  durationMinutes: number;
  exercises: { name: string; reps: string }[];
  stepGoal?: number;
};

export type Program = {
  id: string;
  type: ProgramType;
  title: string;
  subtitle: string;
  description: string;
  durationDays: number;
  difficulty: "Beginner" | "Intermediate";
  accent: string;
  accentBg: string;
  premium: boolean;
  freeDays: number;
  weeklyGrouping?: boolean;
  days: ProgramDay[];
};

function ramp(start: number, end: number, day: number, total: number): number {
  const t = (day - 1) / Math.max(1, total - 1);
  return Math.round(start + (end - start) * t);
}

function buildAbs(): ProgramDay[] {
  const rotations: Array<(d: number) => ProgramDay> = [
    (d) => ({
      day: d,
      title: "Crunch Day",
      durationMinutes: d < 10 ? 2 : 3,
      exercises: [{ name: "Crunches", reps: `${ramp(15, 40, d, 30)} reps` }],
    }),
    (d) => ({
      day: d,
      title: "Leg Raises",
      durationMinutes: d < 10 ? 2 : 3,
      exercises: [{ name: "Sit-ups", reps: `${ramp(12, 30, d, 30)} reps` }],
    }),
    (d) => ({
      day: d,
      title: "Plank Hold",
      durationMinutes: d < 10 ? 2 : 3,
      exercises: [{ name: "Plank", reps: `${ramp(20, 75, d, 30)} seconds` }],
    }),
    (d) => ({
      day: d,
      title: "Bicycle Crunches",
      durationMinutes: d < 10 ? 2 : 3,
      exercises: [
        { name: "Russian Twists", reps: `${ramp(20, 50, d, 30)} reps` },
      ],
    }),
  ];
  return Array.from({ length: 30 }, (_, i) => {
    const d = i + 1;
    return rotations[i % rotations.length](d);
  });
}

function buildLegs(): ProgramDay[] {
  const rotations: Array<(d: number) => ProgramDay> = [
    (d) => ({
      day: d,
      title: "Squat Day",
      durationMinutes: 3,
      exercises: [
        { name: "Bodyweight Squats", reps: `${ramp(20, 50, d, 21)} reps` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Lunge Day",
      durationMinutes: 3,
      exercises: [
        { name: "Forward Lunges", reps: `${ramp(10, 20, d, 21)} each leg` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Glute Bridges",
      durationMinutes: 3,
      exercises: [{ name: "Sit-ups", reps: `${ramp(15, 35, d, 21)} reps` }],
    }),
    (d) => ({
      day: d,
      title: "Wall Sit",
      durationMinutes: 3,
      exercises: [{ name: "Plank", reps: `${ramp(30, 90, d, 21)} seconds` }],
    }),
  ];
  return Array.from({ length: 21 }, (_, i) => {
    const d = i + 1;
    return rotations[i % rotations.length](d);
  });
}

function buildReset(): ProgramDay[] {
  const rotations: Array<(d: number) => ProgramDay> = [
    (d) => ({
      day: d,
      title: "Easy Full Body",
      durationMinutes: 3,
      exercises: [
        { name: "Bodyweight Squats", reps: `${ramp(10, 20, d, 14)} reps` },
        { name: "Knee Pushups", reps: `${ramp(5, 12, d, 14)} reps` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Core Light",
      durationMinutes: 2,
      exercises: [
        { name: "Crunches", reps: `${ramp(10, 20, d, 14)} reps` },
        { name: "Plank", reps: `${ramp(15, 45, d, 14)} seconds` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Stretch + Move",
      durationMinutes: 3,
      exercises: [
        { name: "Jumping Jacks", reps: `${ramp(15, 30, d, 14)} reps` },
        { name: "Forward Lunges", reps: `${ramp(6, 12, d, 14)} each leg` },
      ],
    }),
  ];
  return Array.from({ length: 14 }, (_, i) => {
    const d = i + 1;
    return rotations[i % rotations.length](d);
  });
}

function buildWeightLoss(): ProgramDay[] {
  const rotations: Array<(d: number) => ProgramDay> = [
    (d) => ({
      day: d,
      title: "Cardio Burn",
      durationMinutes: 5,
      exercises: [
        { name: "Jumping Jacks", reps: `${ramp(30, 60, d, 60)} reps` },
        { name: "High Knees", reps: `${ramp(30, 60, d, 60)} seconds` },
      ],
      stepGoal: 5000,
    }),
    (d) => ({
      day: d,
      title: "Lower Body",
      durationMinutes: 5,
      exercises: [
        { name: "Bodyweight Squats", reps: `${ramp(20, 40, d, 60)} reps` },
        { name: "Forward Lunges", reps: `${ramp(10, 20, d, 60)} each leg` },
      ],
      stepGoal: 5000,
    }),
    (d) => ({
      day: d,
      title: "Core Tight",
      durationMinutes: 4,
      exercises: [
        { name: "Plank", reps: `${ramp(30, 75, d, 60)} seconds` },
        { name: "Mountain Climbers", reps: `${ramp(20, 50, d, 60)} reps` },
      ],
      stepGoal: 5000,
    }),
    (d) => ({
      day: d,
      title: "Full Body Blast",
      durationMinutes: 6,
      exercises: [
        { name: "Burpees", reps: `${ramp(6, 15, d, 60)} reps` },
        { name: "Jumping Jacks", reps: `${ramp(20, 40, d, 60)} reps` },
        { name: "Knee Pushups", reps: `${ramp(8, 18, d, 60)} reps` },
      ],
      stepGoal: 6000,
    }),
  ];
  return Array.from({ length: 60 }, (_, i) => {
    const d = i + 1;
    return rotations[i % rotations.length](d);
  });
}

function buildLeanMuscle(): ProgramDay[] {
  const rotations: Array<(d: number) => ProgramDay> = [
    (d) => ({
      day: d,
      title: "Push Day",
      durationMinutes: 7,
      exercises: [
        { name: "Pushups", reps: `${ramp(10, 30, d, 45)} reps` },
        { name: "Knee Pushups", reps: `${ramp(10, 20, d, 45)} reps` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Leg Day",
      durationMinutes: 8,
      exercises: [
        { name: "Bodyweight Squats", reps: `${ramp(25, 50, d, 45)} reps` },
        { name: "Jump Squats", reps: `${ramp(10, 25, d, 45)} reps` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Core Day",
      durationMinutes: 6,
      exercises: [
        { name: "Sit-ups", reps: `${ramp(15, 35, d, 45)} reps` },
        { name: "Plank", reps: `${ramp(30, 90, d, 45)} seconds` },
        { name: "Russian Twists", reps: `${ramp(20, 40, d, 45)} reps` },
      ],
    }),
  ];
  return Array.from({ length: 45 }, (_, i) => {
    const d = i + 1;
    return rotations[i % rotations.length](d);
  });
}

function buildTransformation(): ProgramDay[] {
  const phase1: Array<(d: number) => ProgramDay> = [
    (d) => ({
      day: d,
      title: "Foundation Core",
      durationMinutes: 5,
      exercises: [
        { name: "Crunches", reps: `${ramp(12, 25, d, 30)} reps` },
        { name: "Plank", reps: `${ramp(20, 45, d, 30)} seconds` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Foundation Lower",
      durationMinutes: 6,
      exercises: [
        { name: "Bodyweight Squats", reps: `${ramp(15, 30, d, 30)} reps` },
        { name: "Glute Bridges", reps: `${ramp(12, 22, d, 30)} reps` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Foundation Upper",
      durationMinutes: 6,
      exercises: [
        { name: "Knee Pushups", reps: `${ramp(8, 18, d, 30)} reps` },
        { name: "Arm Circles", reps: `${ramp(20, 40, d, 30)} reps` },
      ],
    }),
  ];
  const phase2: Array<(d: number) => ProgramDay> = [
    (d) => ({
      day: d,
      title: "Build Core",
      durationMinutes: 7,
      exercises: [
        { name: "Sit-ups", reps: `${ramp(20, 35, d, 30)} reps` },
        { name: "Russian Twists", reps: `${ramp(25, 45, d, 30)} reps` },
        { name: "Plank", reps: `${ramp(45, 75, d, 30)} seconds` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Build Lower",
      durationMinutes: 8,
      exercises: [
        { name: "Bodyweight Squats", reps: `${ramp(25, 45, d, 30)} reps` },
        { name: "Forward Lunges", reps: `${ramp(10, 18, d, 30)} each leg` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Build Upper",
      durationMinutes: 8,
      exercises: [
        { name: "Pushups", reps: `${ramp(10, 22, d, 30)} reps` },
        { name: "Tricep Dips", reps: `${ramp(8, 18, d, 30)} reps` },
      ],
    }),
  ];
  const phase3: Array<(d: number) => ProgramDay> = [
    (d) => ({
      day: d,
      title: "Peak Core",
      durationMinutes: 9,
      exercises: [
        { name: "Bicycle Crunches", reps: `${ramp(30, 60, d, 30)} reps` },
        { name: "Leg Raises", reps: `${ramp(15, 30, d, 30)} reps` },
        { name: "Plank", reps: `${ramp(60, 120, d, 30)} seconds` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Peak Power",
      durationMinutes: 9,
      exercises: [
        { name: "Jump Squats", reps: `${ramp(15, 30, d, 30)} reps` },
        { name: "Burpees", reps: `${ramp(8, 18, d, 30)} reps` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Peak Full Body",
      durationMinutes: 10,
      exercises: [
        { name: "Pushups", reps: `${ramp(15, 30, d, 30)} reps` },
        { name: "Mountain Climbers", reps: `${ramp(30, 60, d, 30)} reps` },
        { name: "Bodyweight Squats", reps: `${ramp(30, 50, d, 30)} reps` },
      ],
    }),
  ];
  return Array.from({ length: 90 }, (_, i) => {
    const d = i + 1;
    if (d <= 30) {
      const phaseDay = d;
      return phase1[(phaseDay - 1) % phase1.length](d);
    } else if (d <= 60) {
      const phaseDay = d - 30;
      return phase2[(phaseDay - 1) % phase2.length](d);
    } else {
      const phaseDay = d - 60;
      return phase3[(phaseDay - 1) % phase3.length](d);
    }
  });
}

function buildDailyStarter(): ProgramDay[] {
  const rotations: Array<(d: number) => ProgramDay> = [
    (d) => ({
      day: d,
      title: "Squat & Stretch",
      durationMinutes: 3,
      exercises: [
        { name: "Bodyweight Squats", reps: `${ramp(15, 30, d, 30)} reps` },
        { name: "Arm Circles", reps: `30 seconds` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Core Basics",
      durationMinutes: 3,
      exercises: [
        { name: "Plank", reps: `${ramp(20, 45, d, 30)} seconds` },
        { name: "Crunches", reps: `${ramp(12, 25, d, 30)} reps` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Push Day",
      durationMinutes: 3,
      exercises: [
        { name: "Knee Pushups", reps: `${ramp(8, 18, d, 30)} reps` },
        { name: "Arm Circles", reps: `30 seconds` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Cardio Quick",
      durationMinutes: 3,
      exercises: [
        { name: "Jumping Jacks", reps: `${ramp(25, 45, d, 30)} reps` },
        { name: "High Knees", reps: `30 seconds` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Lunge Focus",
      durationMinutes: 3,
      exercises: [
        { name: "Forward Lunges", reps: `${ramp(8, 15, d, 30)} each leg` },
        { name: "Glute Bridges", reps: `${ramp(12, 22, d, 30)} reps` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Ab Circuit",
      durationMinutes: 3,
      exercises: [
        { name: "Sit-ups", reps: `${ramp(12, 25, d, 30)} reps` },
        { name: "Bicycle Crunches", reps: `${ramp(20, 35, d, 30)} reps` },
      ],
    }),
    (d) => ({
      day: d,
      title: "Full Body Flow",
      durationMinutes: 4,
      exercises: [
        { name: "Jumping Jacks", reps: `${ramp(20, 35, d, 30)} reps` },
        { name: "Bodyweight Squats", reps: `${ramp(10, 20, d, 30)} reps` },
        { name: "Knee Pushups", reps: `${ramp(6, 14, d, 30)} reps` },
      ],
    }),
  ];
  return Array.from({ length: 30 }, (_, i) => {
    const d = i + 1;
    return rotations[i % rotations.length](d);
  });
}

function buildStayActive(): ProgramDay[] {
  const rotations: Array<(d: number) => ProgramDay> = [
    (d) => ({
      day: d,
      title: "Move Day",
      durationMinutes: 4,
      exercises: [
        { name: "Jumping Jacks", reps: `${ramp(20, 40, d, 30)} reps` },
        { name: "Pushups", reps: `${ramp(8, 15, d, 30)} reps` },
      ],
      stepGoal: 10000,
    }),
    (d) => ({
      day: d,
      title: "Strength Day",
      durationMinutes: 5,
      exercises: [
        { name: "Sit-ups", reps: `${ramp(15, 25, d, 30)} reps` },
        { name: "Pushups", reps: `${ramp(10, 20, d, 30)} reps` },
      ],
      stepGoal: 10000,
    }),
  ];
  return Array.from({ length: 30 }, (_, i) => {
    const d = i + 1;
    return rotations[i % rotations.length](d);
  });
}

export const FREE_PROGRAM_ID = "daily-starter";

export const PROGRAMS: Program[] = [
  {
    id: FREE_PROGRAM_ID,
    type: "plan",
    title: "Daily Starter",
    subtitle: "Free · different workout each day",
    description:
      "Your free daily workout plan. A new rotation of simple bodyweight workouts every day — no Pro required.",
    durationDays: 30,
    difficulty: "Beginner",
    accent: "#22C55E",
    accentBg: "rgba(34,197,94,0.15)",
    premium: false,
    freeDays: 30,
    weeklyGrouping: true,
    days: buildDailyStarter(),
  },
  {
    id: "transformation-90",
    type: "challenge",
    title: "90-Day Transformation",
    subtitle: "3 phases · body reset",
    description:
      "Bodyweight-only progression across 3 phases: Foundation, Build, and Peak. Under 10 minutes per day.",
    durationDays: 90,
    difficulty: "Intermediate",
    accent: "#A855F7",
    accentBg: "rgba(168,85,247,0.15)",
    premium: true,
    freeDays: 1,
    weeklyGrouping: true,
    days: buildTransformation(),
  },
  {
    id: "abs-30",
    type: "challenge",
    title: "30-Day Abs",
    subtitle: "Core that shows",
    description: "Simple daily core workouts under 5 minutes.",
    durationDays: 30,
    difficulty: "Beginner",
    accent: "#FFB627",
    accentBg: "rgba(255,182,39,0.12)",
    premium: true,
    freeDays: 1,
    days: buildAbs(),
  },
  {
    id: "legs-21",
    type: "challenge",
    title: "21-Day Legs",
    subtitle: "Stronger in 3 weeks",
    description: "Progressive bodyweight leg workouts to build real strength.",
    durationDays: 21,
    difficulty: "Beginner",
    accent: "#FF6B35",
    accentBg: "rgba(255,107,53,0.15)",
    premium: true,
    freeDays: 1,
    days: buildLegs(),
  },
  {
    id: "reset-14",
    type: "challenge",
    title: "14-Day Reset",
    subtitle: "Get back on track",
    description: "Full-body light workouts to rebuild consistency.",
    durationDays: 14,
    difficulty: "Beginner",
    accent: "#22C55E",
    accentBg: "rgba(34,197,94,0.15)",
    premium: true,
    freeDays: 1,
    days: buildReset(),
  },
  {
    id: "weight-loss-60",
    type: "plan",
    title: "Weight Loss Plan",
    subtitle: "60 days to lighter",
    description:
      "Low-effort daily workouts plus optional step goals. Focus on consistency.",
    durationDays: 60,
    difficulty: "Beginner",
    accent: "#FF6B35",
    accentBg: "rgba(255,107,53,0.15)",
    premium: true,
    freeDays: 1,
    weeklyGrouping: true,
    days: buildWeightLoss(),
  },
  {
    id: "lean-muscle-45",
    type: "plan",
    title: "Lean Muscle Plan",
    subtitle: "Build, don't bulk",
    description:
      "Higher-rep bodyweight sessions for lean strength. Still under 10 minutes.",
    durationDays: 45,
    difficulty: "Intermediate",
    accent: "#FFB627",
    accentBg: "rgba(255,182,39,0.15)",
    premium: true,
    freeDays: 1,
    weeklyGrouping: true,
    days: buildLeanMuscle(),
  },
  {
    id: "stay-active-30",
    type: "plan",
    title: "Stay Active Plan",
    subtitle: "Move every day",
    description: "10,000 steps + quick bodyweight movements daily.",
    durationDays: 30,
    difficulty: "Beginner",
    accent: "#22C55E",
    accentBg: "rgba(34,197,94,0.15)",
    premium: true,
    freeDays: 1,
    weeklyGrouping: true,
    days: buildStayActive(),
  },
];

export function getProgram(id: string): Program | undefined {
  return PROGRAMS.find((p) => p.id === id);
}

export function getChallenges(): Program[] {
  return PROGRAMS.filter((p) => p.type === "challenge");
}

export function getPlans(): Program[] {
  return PROGRAMS.filter((p) => p.type === "plan");
}
