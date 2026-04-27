export type FitnessLevel = "beginner" | "intermediate";
export type Goal = "lose_weight" | "build_muscle" | "stay_active";

export const EXERCISE_DESCRIPTIONS: Record<string, string> = {
  "Bodyweight Squats":
    "Stand with feet shoulder-width apart. Lower your hips back and down like sitting in a chair, keeping your chest up. Return to standing.",
  "Plank":
    "Forearms on the floor, elbows under shoulders, body in a straight line from head to heels. Keep your core tight and hold.",
  "Crunches":
    "Lie on your back, knees bent, feet flat. Hands behind your head. Lift your shoulders off the floor using your abs, then lower with control.",
  "Knee Pushups":
    "Start on your knees in a plank position, hands under shoulders. Lower your chest toward the floor, then press back up.",
  "Pushups":
    "Hands under shoulders, body in a straight line from head to heels. Lower your chest to the floor, then press back up.",
  "Jumping Jacks":
    "Start standing. Jump your feet out while raising your arms overhead. Jump back to the start. Stay light on your feet.",
  "Forward Lunges":
    "Step one foot forward and lower your back knee toward the floor. Push off your front foot to return. Alternate legs.",
  "Sit-ups":
    "Lie on your back, knees bent. Use your abs to lift your torso all the way up, then lower with control.",
  "High Knees":
    "Jog in place, driving your knees up toward your chest as fast as you can while pumping your arms.",
  "Jump Squats":
    "Perform a squat, then explode up into a jump. Land softly and immediately drop into the next squat.",
  "Burpees":
    "From standing, drop into a squat, kick your feet back into a plank, do a pushup (optional), jump feet back in, and jump up.",
  "Mountain Climbers":
    "Start in a high plank. Drive one knee toward your chest, then switch legs quickly, like running in place.",
  "Russian Twists":
    "Sit with knees bent, lean back slightly, and lift your feet. Rotate your torso side to side, tapping the floor next to your hips.",
  "Glute Bridges":
    "Lie on your back, knees bent, feet flat on the floor. Squeeze your glutes and lift your hips until your body forms a straight line from shoulders to knees. Lower with control.",
  "Wall Sit":
    "Lean your back flat against a wall and slide down until your knees are bent at 90 degrees. Hold the position, keeping your core tight.",
  "Calf Raises":
    "Stand tall with feet hip-width apart. Push through the balls of your feet to raise your heels as high as possible, then lower slowly.",
  "Bicycle Crunches":
    "Lie on your back, hands behind your head. Bring opposite elbow to opposite knee in a pedaling motion while extending the other leg.",
  "Leg Raises":
    "Lie flat on your back, legs straight. Keeping legs together, lift them up to 90 degrees, then lower slowly without letting them touch the floor.",
  "Flutter Kicks":
    "Lie on your back, legs extended and slightly off the floor. Alternate kicking your legs up and down in a quick, controlled motion.",
  "Superman":
    "Lie face down, arms extended overhead. Simultaneously lift your arms, chest, and legs off the floor. Hold briefly, then lower.",
  "Incline Pushups":
    "Place your hands on an elevated surface like a couch or bench. Lower your chest toward the surface, then press back up.",
  "Tricep Dips":
    "Sit on the edge of a chair, hands gripping the edge. Slide forward and lower your body by bending your elbows, then press back up.",
  "Arm Circles":
    "Extend your arms out to the sides at shoulder height. Make small circles forward, then reverse. Keep your core engaged.",
  "Shoulder Taps":
    "Start in a high plank. Tap your left shoulder with your right hand, then your right shoulder with your left hand. Keep hips stable.",
  "Skater Jumps":
    "Leap sideways from one foot to the other, landing softly and swinging your arms for balance, like a speed skater.",
  "Butt Kicks":
    "Jog in place, kicking your heels up toward your glutes as quickly as possible while pumping your arms.",
  "Step-ups":
    "Step one foot onto a sturdy surface, drive through your heel to stand up, then step back down. Alternate legs.",
  "Reverse Lunges":
    "Step one foot backward and lower your back knee toward the floor. Push through your front heel to return. Alternate legs.",
  "Side Lunges":
    "Step wide to one side, bending that knee while keeping the other leg straight. Push back to center. Alternate sides.",
};

export function getExerciseDescription(name: string): string {
  return (
    EXERCISE_DESCRIPTIONS[name] ??
    "Perform the movement slowly with good form. Breathe steadily and focus on control over speed."
  );
}

export type Workout = {
  id: string;
  title: string;
  category: "legs" | "core" | "full_body" | "upper";
  durationMinutes: number;
  exercises: { name: string; reps: string }[];
  motivational: string;
};

const BEGINNER_WORKOUTS: Workout[] = [
  {
    id: "b-legs",
    title: "20 Bodyweight Squats",
    category: "legs",
    durationMinutes: 2,
    exercises: [{ name: "Bodyweight Squats", reps: "20 reps" }],
    motivational: "Two minutes. No excuses.",
  },
  {
    id: "b-core",
    title: "30-Second Plank + 15 Crunches",
    category: "core",
    durationMinutes: 2,
    exercises: [
      { name: "Plank", reps: "30 seconds" },
      { name: "Crunches", reps: "15 reps" },
    ],
    motivational: "Your core will thank you tomorrow.",
  },
  {
    id: "b-upper",
    title: "10 Knee Pushups",
    category: "upper",
    durationMinutes: 2,
    exercises: [{ name: "Knee Pushups", reps: "10 reps" }],
    motivational: "Ten reps. That's all.",
  },
  {
    id: "b-full",
    title: "Quick Full Body",
    category: "full_body",
    durationMinutes: 3,
    exercises: [
      { name: "Squats", reps: "15 reps" },
      { name: "Knee Pushups", reps: "8 reps" },
      { name: "Jumping Jacks", reps: "20 reps" },
    ],
    motivational: "Three rounds. Three minutes. Done.",
  },
  {
    id: "b-legs-2",
    title: "15 Lunges (Each Leg)",
    category: "legs",
    durationMinutes: 2,
    exercises: [{ name: "Forward Lunges", reps: "15 each leg" }],
    motivational: "Strong legs, strong life.",
  },
  {
    id: "b-core-2",
    title: "20 Sit-ups",
    category: "core",
    durationMinutes: 2,
    exercises: [{ name: "Sit-ups", reps: "20 reps" }],
    motivational: "Feel the burn. Own the day.",
  },
  {
    id: "b-full-2",
    title: "Cardio Blast",
    category: "full_body",
    durationMinutes: 3,
    exercises: [
      { name: "Jumping Jacks", reps: "30 reps" },
      { name: "High Knees", reps: "30 seconds" },
      { name: "Bodyweight Squats", reps: "10 reps" },
    ],
    motivational: "Heart pumping. Mind clear.",
  },
  {
    id: "b-legs-3",
    title: "20 Glute Bridges",
    category: "legs",
    durationMinutes: 2,
    exercises: [{ name: "Glute Bridges", reps: "20 reps" }],
    motivational: "Wake up those glutes.",
  },
  {
    id: "b-legs-4",
    title: "30-Second Wall Sit",
    category: "legs",
    durationMinutes: 2,
    exercises: [
      { name: "Wall Sit", reps: "30 seconds" },
      { name: "Calf Raises", reps: "20 reps" },
    ],
    motivational: "Hold steady. Stay strong.",
  },
  {
    id: "b-core-3",
    title: "Bicycle Crunches",
    category: "core",
    durationMinutes: 2,
    exercises: [{ name: "Bicycle Crunches", reps: "20 reps" }],
    motivational: "Small moves. Big difference.",
  },
  {
    id: "b-core-4",
    title: "Lower Ab Focus",
    category: "core",
    durationMinutes: 2,
    exercises: [
      { name: "Leg Raises", reps: "12 reps" },
      { name: "Flutter Kicks", reps: "30 seconds" },
    ],
    motivational: "Target the stubborn spots.",
  },
  {
    id: "b-upper-2",
    title: "Incline Pushups",
    category: "upper",
    durationMinutes: 2,
    exercises: [{ name: "Incline Pushups", reps: "12 reps" }],
    motivational: "Easier angle. Same result.",
  },
  {
    id: "b-upper-3",
    title: "Arm Starter",
    category: "upper",
    durationMinutes: 2,
    exercises: [
      { name: "Tricep Dips", reps: "10 reps" },
      { name: "Arm Circles", reps: "30 seconds" },
    ],
    motivational: "Arms on fire. In a good way.",
  },
  {
    id: "b-full-3",
    title: "Morning Mover",
    category: "full_body",
    durationMinutes: 3,
    exercises: [
      { name: "Butt Kicks", reps: "30 seconds" },
      { name: "Forward Lunges", reps: "10 each leg" },
      { name: "Superman", reps: "12 reps" },
    ],
    motivational: "Wake up the whole body.",
  },
];

const INTERMEDIATE_WORKOUTS: Workout[] = [
  {
    id: "i-legs",
    title: "40 Bodyweight Squats",
    category: "legs",
    durationMinutes: 3,
    exercises: [{ name: "Bodyweight Squats", reps: "40 reps" }],
    motivational: "You can't skip. It takes less than 3 minutes.",
  },
  {
    id: "i-core",
    title: "60-Second Plank + 30 Crunches",
    category: "core",
    durationMinutes: 3,
    exercises: [
      { name: "Plank", reps: "60 seconds" },
      { name: "Crunches", reps: "30 reps" },
    ],
    motivational: "Core of steel. Built in minutes.",
  },
  {
    id: "i-upper",
    title: "25 Pushups",
    category: "upper",
    durationMinutes: 3,
    exercises: [{ name: "Pushups", reps: "25 reps" }],
    motivational: "Push through. One rep at a time.",
  },
  {
    id: "i-full",
    title: "Full Body Circuit",
    category: "full_body",
    durationMinutes: 4,
    exercises: [
      { name: "Squats", reps: "25 reps" },
      { name: "Pushups", reps: "15 reps" },
      { name: "Burpees", reps: "10 reps" },
    ],
    motivational: "Four minutes to better.",
  },
  {
    id: "i-legs-2",
    title: "30 Jump Squats",
    category: "legs",
    durationMinutes: 3,
    exercises: [{ name: "Jump Squats", reps: "30 reps" }],
    motivational: "Explosive power. Short burst.",
  },
  {
    id: "i-core-2",
    title: "Core Crusher",
    category: "core",
    durationMinutes: 3,
    exercises: [
      { name: "Mountain Climbers", reps: "40 reps" },
      { name: "Russian Twists", reps: "30 reps" },
    ],
    motivational: "Twist. Burn. Repeat.",
  },
  {
    id: "i-full-2",
    title: "Burpee Challenge",
    category: "full_body",
    durationMinutes: 4,
    exercises: [
      { name: "Burpees", reps: "15 reps" },
      { name: "Pushups", reps: "10 reps" },
      { name: "Jumping Jacks", reps: "30 reps" },
    ],
    motivational: "The hard way is the fast way.",
  },
  {
    id: "i-legs-3",
    title: "Lunge Ladder",
    category: "legs",
    durationMinutes: 3,
    exercises: [
      { name: "Forward Lunges", reps: "20 each leg" },
      { name: "Reverse Lunges", reps: "15 each leg" },
    ],
    motivational: "Every step forward. Every step back. All progress.",
  },
  {
    id: "i-legs-4",
    title: "Wall Sit Burn",
    category: "legs",
    durationMinutes: 3,
    exercises: [
      { name: "Wall Sit", reps: "60 seconds" },
      { name: "Calf Raises", reps: "30 reps" },
    ],
    motivational: "Pain is temporary. Results stay.",
  },
  {
    id: "i-core-3",
    title: "Ab Finisher",
    category: "core",
    durationMinutes: 3,
    exercises: [
      { name: "Leg Raises", reps: "20 reps" },
      { name: "Bicycle Crunches", reps: "30 reps" },
      { name: "Flutter Kicks", reps: "45 seconds" },
    ],
    motivational: "No shortcuts. Only results.",
  },
  {
    id: "i-core-4",
    title: "Plank Variations",
    category: "core",
    durationMinutes: 3,
    exercises: [
      { name: "Plank", reps: "45 seconds" },
      { name: "Shoulder Taps", reps: "30 reps" },
      { name: "Superman", reps: "15 reps" },
    ],
    motivational: "Steady strength. Rock solid core.",
  },
  {
    id: "i-upper-2",
    title: "Upper Body Burn",
    category: "upper",
    durationMinutes: 3,
    exercises: [
      { name: "Pushups", reps: "15 reps" },
      { name: "Tricep Dips", reps: "20 reps" },
    ],
    motivational: "Push. Pull. Power.",
  },
  {
    id: "i-full-3",
    title: "Skater Sprint",
    category: "full_body",
    durationMinutes: 4,
    exercises: [
      { name: "Skater Jumps", reps: "40 reps" },
      { name: "Mountain Climbers", reps: "30 seconds" },
      { name: "Pushups", reps: "12 reps" },
    ],
    motivational: "Move fast. Finish strong.",
  },
  {
    id: "i-full-4",
    title: "HIIT Express",
    category: "full_body",
    durationMinutes: 4,
    exercises: [
      { name: "High Knees", reps: "45 seconds" },
      { name: "Jump Squats", reps: "20 reps" },
      { name: "Burpees", reps: "10 reps" },
      { name: "Butt Kicks", reps: "30 seconds" },
    ],
    motivational: "Short. Intense. Effective.",
  },
];

export function getTodayWorkout(level: FitnessLevel, dayIndex: number): Workout {
  const pool = level === "beginner" ? BEGINNER_WORKOUTS : INTERMEDIATE_WORKOUTS;
  return pool[dayIndex % pool.length];
}

export function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
