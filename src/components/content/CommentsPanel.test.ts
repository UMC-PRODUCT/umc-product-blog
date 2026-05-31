import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const commentsPanelSource = readFileSync(
  resolve(process.cwd(), 'src/components/content/CommentsPanel.astro'),
  'utf8',
);

describe('CommentsPanel empty comment feedback', () => {
  it('shows empty comment validation through toast instead of inline status', () => {
    expect(commentsPanelSource).toContain('message: "댓글 내용을 입력해 주세요."');
    expect(commentsPanelSource).not.toContain('setStatus(root, "댓글 내용을 입력해 주세요.")');
  });
});

describe('CommentsPanel multiline comment rendering', () => {
  it('preserves explicit line breaks and wraps long comment text', () => {
    expect(commentsPanelSource).toContain(
      'const COMMENT_BODY_CLASS = "text-body-2-regular whitespace-pre-wrap break-words text-teal-gray-800";',
    );
    expect(commentsPanelSource).toContain('body.textContent = comment.content;');
  });
});

describe('CommentsPanel guest nickname input', () => {
  it('uses a full-width input with an inline random nickname button', () => {
    expect(commentsPanelSource).toContain('placeholder="닉네임을 입력하세요"');
    expect(commentsPanelSource).toContain('data-comment-guest-nickname-random');
    expect(commentsPanelSource).toContain('<div class="group relative w-full">');
    expect(commentsPanelSource).toContain('bg-teal-gray-100');
    expect(commentsPanelSource).toContain('text-teal-gray-600');
    expect(commentsPanelSource).toContain(
      'group-focus-within:ring-1 group-focus-within:ring-teal-gray-300',
    );
    expect(commentsPanelSource).toContain('focus-visible:ring-2 focus-visible:ring-teal-300');
    expect(commentsPanelSource).toContain(
      'import { generateRandomNickname } from "@/lib/random-nickname";',
    );
    expect(commentsPanelSource).toContain('guestNickname.value = generateRandomNickname();');
  });

  it('does not prefill anonymous text and keeps guest input visually quieter than member name', () => {
    expect(commentsPanelSource).not.toContain('value="익명"');
    expect(commentsPanelSource).not.toContain('guestNickname.value = "익명"');
    expect(commentsPanelSource).toContain(
      'const nicknameInputClass =\n  "text-body-2-regular h-11 w-full',
    );
    expect(commentsPanelSource).toContain('text-teal-gray-700');
    expect(commentsPanelSource).toContain(
      '<span class="text-label-1-medium min-w-0 truncate text-teal-gray-900" data-comment-author-name>Member</span>',
    );
  });
});
