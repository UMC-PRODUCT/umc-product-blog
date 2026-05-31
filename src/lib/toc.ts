export type TocHeadingCandidate = {
  id: string;
  top: number;
  isIntersecting: boolean;
};

export function selectActiveHeadingId(
  candidates: readonly TocHeadingCandidate[],
): string | undefined {
  const visible = candidates
    .filter((candidate) => candidate.isIntersecting)
    .sort((left, right) => Math.abs(left.top) - Math.abs(right.top));

  return visible[0]?.id;
}
