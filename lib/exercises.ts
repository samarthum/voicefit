// Predefined list of exercises for consistent naming
export const EXERCISES = [
  // Chest
  "Bench Press",
  "Incline Bench Press",
  "Decline Bench Press",
  "Dumbbell Bench Press",
  "Incline Dumbbell Press",
  "Dumbbell Fly",
  "Cable Fly",
  "Push-Up",
  "Chest Dip",
  "Floor Press",

  // Back
  "Deadlift",
  "Barbell Row",
  "Dumbbell Row",
  "Pull-Up",
  "Chin-Up",
  "Lat Pulldown",
  "Seated Cable Row",
  "T-Bar Row",
  "Face Pull",

  // Shoulders
  "Overhead Press",
  "Dumbbell Shoulder Press",
  "Arnold Press",
  "Lateral Raise",
  "Front Raise",
  "Rear Delt Fly",
  "Upright Row",
  "Shrug",

  // Legs
  "Squat",
  "Front Squat",
  "Leg Press",
  "Lunge",
  "Bulgarian Split Squat",
  "Romanian Deadlift",
  "Leg Curl",
  "Leg Extension",
  "Calf Raise",
  "Hip Thrust",
  "Goblet Squat",

  // Arms
  "Bicep Curl",
  "Hammer Curl",
  "Preacher Curl",
  "Tricep Pushdown",
  "Tricep Extension",
  "Skull Crusher",
  "Close-Grip Bench Press",
  "Dip",

  // Core
  "Plank",
  "Crunch",
  "Leg Raise",
  "Russian Twist",
  "Ab Wheel Rollout",
  "Cable Crunch",

  // Cardio/Other
  "Kettlebell Swing",
  "Clean",
  "Snatch",
  "Thruster",
  "Burpee",
] as const;

export type ExerciseName = typeof EXERCISES[number];

// Helper to find closest matching exercise
export function normalizeExerciseName(input: string): string {
  const normalized = input.toLowerCase().trim();

  // Direct match
  const directMatch = EXERCISES.find(
    (e) => e.toLowerCase() === normalized
  );
  if (directMatch) return directMatch;

  // Partial match
  const partialMatch = EXERCISES.find(
    (e) => e.toLowerCase().includes(normalized) || normalized.includes(e.toLowerCase())
  );
  if (partialMatch) return partialMatch;

  // Return original with title case if no match
  return input.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}
