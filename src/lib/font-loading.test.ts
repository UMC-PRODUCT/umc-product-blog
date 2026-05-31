import { describe, expect, it } from 'vitest';

import layout from '../layouts/BaseLayout.astro?raw';
import globalCss from '../styles/global.css?raw';

describe('font loading', () => {
  it('loads Pretendard from the CDN instead of the bundled package', () => {
    expect(layout).toContain(
      'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css',
    );
    expect(globalCss).not.toContain("pretendard/dist/web");
  });
});
