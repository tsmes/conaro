export type CoverGradientClass =
  | "cover-a"
  | "cover-b"
  | "cover-c"
  | "cover-d"
  | "cover-e"
  | "cover-f";

const GRADIENTS: readonly CoverGradientClass[] = [
  "cover-a",
  "cover-b",
  "cover-c",
  "cover-d",
  "cover-e",
  "cover-f",
] as const;

// Deterministic gradient selection from a convention id. Same id always
// produces the same gradient so card covers are stable across renders.
export function pickCoverGradient(conventionId: string): CoverGradientClass {
  let sum = 0;
  for (let i = 0; i < conventionId.length; i += 1) {
    sum += conventionId.charCodeAt(i);
  }
  return GRADIENTS[sum % GRADIENTS.length];
}
