export const NICKNAME_ADJECTIVES = [
  '다정한',
  '차분한',
  '활기찬',
  '꼼꼼한',
  '반짝이는',
  '든든한',
  '유쾌한',
  '날렵한',
  '따뜻한',
  '용감한',
  '집요한',
  '명쾌한',
  '재빠른',
  '섬세한',
  '끈질긴',
  '논리적인',
  '창의적인',
  '성실한',
  '스마트한',
  '디버깅하는',
  '기도하는',
] as const;

export const NICKNAME_NOUNS = [
  '메이커',
  '기획자',
  '디자이너',
  '개발자',
  '탐험가',
  '러너',
  '빌더',
  '서포터',
  '크루',
  '드리머',
  '디버거',
  '커밋러',
  '리팩터러',
  '아키텍트',
  '엔지니어',
  '오거나이저',
  '리뷰어',
  '배포요정',
  '버그헌터',
] as const;

type RandomSource = () => number;

function pickWord<T extends readonly string[]>(words: T, random: RandomSource): T[number] {
  const index = Math.min(words.length - 1, Math.floor(random() * words.length));
  return words[Math.max(0, index)];
}

export function generateRandomNickname(random: RandomSource = Math.random): string {
  return `${pickWord(NICKNAME_ADJECTIVES, random)}${pickWord(NICKNAME_NOUNS, random)}`;
}
