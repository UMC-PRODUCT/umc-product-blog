export type InitialSource = {
  name?: string;
  nickname?: string;
  profileImageId?: string;
  profileImageExtension?: string;
};

const MEMBER_PROFILE_IMAGE_BASE_URL = 'https://cdn.university.neordinary.com/product-team/profile';

export function formatDate(date: Date | string | number): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  }).format(new Date(date));
}

export function getInitials(source: InitialSource): string {
  const basis = source.nickname?.trim() || source.name?.trim() || 'UMC';
  return Array.from(basis)[0]?.toUpperCase() ?? 'U';
}

export function getMemberProfileImageUrl(source: InitialSource): string | undefined {
  const profileImageId = source.profileImageId?.trim();

  if (!profileImageId) {
    return undefined;
  }

  const extension = normalizeImageExtension(source.profileImageExtension);

  return `${MEMBER_PROFILE_IMAGE_BASE_URL}/${encodeURIComponent(profileImageId)}.${extension}`;
}

function normalizeImageExtension(extension?: string): string {
  return extension?.trim().replace(/^\./, '') || 'png';
}
