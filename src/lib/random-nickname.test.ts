import { describe, expect, it } from 'vitest';

import { NICKNAME_ADJECTIVES, NICKNAME_NOUNS, generateRandomNickname } from './random-nickname';

describe('generateRandomNickname', () => {
  it('combines words from the configured adjective and noun pools', () => {
    const randomValues = [0, 0.999];
    const nickname = generateRandomNickname(() => randomValues.shift() ?? 0);

    expect(NICKNAME_ADJECTIVES.length).toBeGreaterThanOrEqual(8);
    expect(NICKNAME_NOUNS.length).toBeGreaterThanOrEqual(8);
    expect(nickname).toBe(`${NICKNAME_ADJECTIVES[0]}${NICKNAME_NOUNS.at(-1)}`);
    expect(nickname.length).toBeLessThanOrEqual(20);
  });
});
