import { describe, expect, it } from 'vitest';

import { selectActiveHeadingId } from './toc';

describe('toc helpers', () => {
  it('selects the visible heading nearest the viewport top', () => {
    expect(
      selectActiveHeadingId([
        { id: 'intro', top: -120, isIntersecting: false },
        { id: 'setup', top: 80, isIntersecting: true },
        { id: 'details', top: 240, isIntersecting: true },
      ]),
    ).toBe('setup');
  });

  it('returns undefined when no headings are visible', () => {
    expect(selectActiveHeadingId([{ id: 'intro', top: 0, isIntersecting: false }])).toBeUndefined();
  });
});
