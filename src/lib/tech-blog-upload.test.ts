import { describe, expect, it, vi } from 'vitest';

import {
  type AuthenticatedUploadRequest,
  TECH_BLOG_CDN_BASE_URL,
  TECH_BLOG_FILE_CATEGORY,
  buildMarkdownImage,
  buildPrepareUploadBody,
  buildTechBlogImageUrl,
  confirmTechBlogImageUpload,
  createWebpFileName,
  insertTextAtRange,
  prepareTechBlogImageUpload,
  resolveStorageApiUrl,
  scaleImageDimensions,
} from './tech-blog-upload';

describe('tech blog upload helpers', () => {
  it('uses the TECH_BLOG category for uploaded blog images', () => {
    const body = buildPrepareUploadBody({
      name: 'cover.webp',
      type: 'image/webp',
      size: 42_000,
    });

    expect(body).toEqual({
      fileName: 'cover.webp',
      contentType: 'image/webp',
      fileSize: 42_000,
      category: TECH_BLOG_FILE_CATEGORY,
    });
  });

  it('creates safe webp file names from original image names', () => {
    expect(createWebpFileName('My Screenshot 01.PNG', 1_717_200_000_000)).toBe(
      'my-screenshot-01-1717200000000.webp',
    );
    expect(createWebpFileName('한글 이미지.jpeg', 1)).toBe('image-1.webp');
    expect(createWebpFileName('', 2)).toBe('image-2.webp');
  });

  it('builds fixed CDN image URLs from uploaded file ids', () => {
    expect(buildTechBlogImageUrl('file-123')).toBe(`${TECH_BLOG_CDN_BASE_URL}/file-123`);
  });

  it('builds markdown image syntax with fixed CDN image URLs', () => {
    expect(buildMarkdownImage({ fileId: 'file-123', alt: '아키텍처 다이어그램' })).toBe(
      '![아키텍처 다이어그램](https://cdn.university.neordinary.com/file-123)',
    );
  });

  it('inserts uploaded image markdown at the editor selection', () => {
    expect(
      insertTextAtRange('hello world', '![x](https://cdn.university.neordinary.com/1)', 6, 11),
    ).toBe('hello ![x](https://cdn.university.neordinary.com/1)');
  });

  it('resolves storage API URLs with or without a configured backend base URL', () => {
    expect(resolveStorageApiUrl('', '/api/v1/storage/prepare-upload')).toBe(
      '/api/v1/storage/prepare-upload',
    );
    expect(resolveStorageApiUrl('https://api.example.com/', '/api/v1/storage/prepare-upload')).toBe(
      'https://api.example.com/api/v1/storage/prepare-upload',
    );
  });

  it('scales large images down while preserving aspect ratio', () => {
    expect(scaleImageDimensions({ width: 4000, height: 3000, maxLongEdge: 1600 })).toEqual({
      width: 1600,
      height: 1200,
    });
    expect(scaleImageDimensions({ width: 1200, height: 800, maxLongEdge: 1600 })).toEqual({
      width: 1200,
      height: 800,
    });
  });

  it('uses the authenticated request for prepare and confirm upload calls', async () => {
    const requestMock = vi.fn();
    const request: AuthenticatedUploadRequest = async <T>(
      path: string,
      options: { method: string; body?: unknown },
    ): Promise<T> => {
      requestMock(path, options);
      if (path === '/api/v1/storage/prepare-upload') {
        return {
          fileId: 'file-123',
          uploadUrl: 'https://upload.example.com',
          uploadMethod: 'PUT' as const,
          headers: {},
          expiresAt: '2026-06-02T00:00:00Z',
        } as T;
      }

      return undefined as T;
    };

    await expect(
      prepareTechBlogImageUpload(
        {
          name: 'cover.webp',
          type: 'image/webp',
          size: 100,
        },
        request,
      ),
    ).resolves.toMatchObject({ fileId: 'file-123' });
    await confirmTechBlogImageUpload('file-123', request);

    expect(requestMock).toHaveBeenCalledWith('/api/v1/storage/prepare-upload', {
      method: 'POST',
      body: {
        fileName: 'cover.webp',
        contentType: 'image/webp',
        fileSize: 100,
        category: TECH_BLOG_FILE_CATEGORY,
      },
    });
    expect(requestMock).toHaveBeenCalledWith('/api/v1/storage/file-123/confirm', {
      method: 'POST',
    });
  });
});
