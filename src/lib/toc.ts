export type TocHeadingCandidate = {
  id: string;
  top: number;
  isIntersecting: boolean;
};

export type TocLinkVisualState = {
  ariaCurrent?: 'true';
  add: readonly string[];
  remove: readonly string[];
};

const activeTocLinkClasses = ['text-ds-primary-strong', 'font-semibold'] as const;
const inactiveTocLinkClasses = ['text-ds-text-muted'] as const;

export function getTocLinkVisualState(isActive: boolean): TocLinkVisualState {
  if (isActive) {
    return {
      ariaCurrent: 'true',
      add: activeTocLinkClasses,
      remove: inactiveTocLinkClasses,
    };
  }

  return {
    add: inactiveTocLinkClasses,
    remove: activeTocLinkClasses,
  };
}

export function selectActiveHeadingId(
  candidates: readonly TocHeadingCandidate[],
): string | undefined {
  const visible = candidates
    .filter((candidate) => candidate.isIntersecting)
    .sort((left, right) => Math.abs(left.top) - Math.abs(right.top));

  return visible[0]?.id;
}
