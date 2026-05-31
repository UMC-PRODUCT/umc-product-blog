export const PARTS = {
  pm: {
    id: 'pm',
    label: 'PM',
  },
  design: {
    id: 'design',
    label: 'Design',
  },
  ios: {
    id: 'ios',
    label: 'iOS',
  },
  android: {
    id: 'android',
    label: 'Android',
  },
  web: {
    id: 'web',
    label: 'Web',
  },
  server: {
    id: 'server',
    label: 'Server',
  },
} as const;

export const PART_IDS = ['pm', 'design', 'ios', 'android', 'web', 'server'] as const;
export type PartId = (typeof PART_IDS)[number];

export const BLOG_AREAS = {
  engineering: {
    id: 'engineering',
    label: 'Engineering',
    title: 'Engineering',
    description: '프로덕트팀 엔지니어들이 문제를 정의하고 기술로 해결해가는 여정을 함께해봐요.',
    parts: ['ios', 'android', 'web', 'server'],
  },
  design: {
    id: 'design',
    label: 'Design',
    title: 'Design',
    description:
      '최고의 사용자 경험을 만들기 위한 프로덕트팀 디자이너들의 고민과 인사이트를 공유합니다.',
    parts: ['design'],
  },
  product: {
    id: 'product',
    label: 'Product',
    title: 'Product',
    description:
      '사용자를 위한 제품을 만들어나가기 위한 프로덕트팀의 팀 문화와 개발 방식을 만나보세요.',
    parts: ['pm'],
  },
} as const satisfies Record<
  string,
  {
    id: string;
    label: string;
    title: string;
    description: string;
    parts: readonly PartId[];
  }
>;

export const BLOG_AREA_IDS = ['engineering', 'design', 'product'] as const;
export type BlogAreaId = (typeof BLOG_AREA_IDS)[number];

export const PLATFORM_IDS = ['ios', 'android', 'web', 'server'] as const;
export type PlatformId = (typeof PLATFORM_IDS)[number];

// Member team section order. Individual member order still comes from participation.order.
export const MEMBER_TEAM_CATEGORY_ORDER = [
  'Head of Product',
  'Product Owner',
  'Design',
  'Web',
  'iOS',
  'Android',
  'Server',
] as const;

export function getPartLabel(part: string): string {
  return PARTS[part as PartId]?.label ?? part;
}

export function getBlogAreaPath(area: BlogAreaId): string {
  return `/${area}`;
}
