import { describe, expect, it } from 'vitest';

import * as tocHelpers from './toc';

type TocLinkVisualState = {
  ariaCurrent?: 'true';
  add: readonly string[];
  remove: readonly string[];
};

function getTocLinkVisualState(isActive: boolean): TocLinkVisualState | undefined {
  return (
    tocHelpers as typeof tocHelpers & {
      getTocLinkVisualState?: (isActive: boolean) => TocLinkVisualState;
    }
  ).getTocLinkVisualState?.(isActive);
}

describe('toc helpers', () => {
  it('selects the visible heading nearest the viewport top', () => {
    expect(
      tocHelpers.selectActiveHeadingId([
        { id: 'intro', top: -120, isIntersecting: false },
        { id: 'setup', top: 80, isIntersecting: true },
        { id: 'details', top: 240, isIntersecting: true },
      ]),
    ).toBe('setup');
  });

  it('returns undefined when no headings are visible', () => {
    expect(
      tocHelpers.selectActiveHeadingId([{ id: 'intro', top: 0, isIntersecting: false }]),
    ).toBeUndefined();
  });

  it('applies the primary-strong color and removes muted color for the active heading link', () => {
    expect(getTocLinkVisualState(true)).toEqual({
      ariaCurrent: 'true',
      add: ['text-ds-primary-strong', 'font-semibold'],
      remove: ['text-ds-text-muted'],
    });
  });

  it('restores muted color and clears active styles for inactive heading links', () => {
    expect(getTocLinkVisualState(false)).toEqual({
      add: ['text-ds-text-muted'],
      remove: ['text-ds-primary-strong', 'font-semibold'],
    });
  });
});
