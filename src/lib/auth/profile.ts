import type { AuthMember } from './types';

export function getAuthMemberDisplayName(member: Pick<AuthMember, 'name' | 'nickname'>): string {
  return member.nickname || member.name || 'Member';
}

export function getAuthMemberInitial(member: Pick<AuthMember, 'name' | 'nickname'> | null): string {
  const displayName = member ? getAuthMemberDisplayName(member).trim() : '';
  return displayName.charAt(0).toUpperCase() || 'M';
}

export function getAuthMemberProfileImage(
  member: Pick<AuthMember, 'profileImageLink'> | null,
): string | null {
  const profileImageLink = member?.profileImageLink?.trim();
  return profileImageLink || null;
}
