import { apiFetch } from './auth/api';

export const TECH_BLOG_FILE_CATEGORY = 'TECH_BLOG';
export const TECH_BLOG_IMAGE_CONTENT_TYPE = 'image/webp';
export const TECH_BLOG_CDN_BASE_URL = 'https://cdn.university.neordinary.com';

const DEFAULT_WEBP_QUALITY = 0.82;
const DEFAULT_MAX_LONG_EDGE = 1600;

export type FileLike = {
  name: string;
  type: string;
  size: number;
};

export type PrepareUploadBody = {
  fileName: string;
  contentType: string;
  fileSize: number;
  category: typeof TECH_BLOG_FILE_CATEGORY;
};

export type ApiResponse<T> = {
  success: boolean;
  code: string;
  message: string;
  result: T;
};

export type PrepareUploadResult = {
  fileId: string;
  uploadUrl: string;
  uploadMethod: 'PUT';
  headers: Record<string, string>;
  expiresAt: string;
};

export type UploadedTechBlogImage = {
  fileId: string;
  fileName: string;
  originalName: string;
  originalSize: number;
  optimizedSize: number;
};

type ConvertImageOptions = {
  quality?: number;
  maxLongEdge?: number;
  now?: number;
};

type UploadImageOptions = ConvertImageOptions & {
  request?: AuthenticatedUploadRequest;
};

export type AuthenticatedUploadRequest = <T>(
  path: string,
  options: { method: string; body?: unknown },
) => Promise<T>;

export function createWebpFileName(originalName: string, now = Date.now()): string {
  const withoutExtension = originalName.replace(/\.[^/.]+$/, '');
  const slug = withoutExtension
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug || 'image'}-${now}.webp`;
}

export function buildPrepareUploadBody(file: FileLike): PrepareUploadBody {
  return {
    fileName: file.name,
    contentType: TECH_BLOG_IMAGE_CONTENT_TYPE,
    fileSize: file.size,
    category: TECH_BLOG_FILE_CATEGORY,
  };
}

export function buildTechBlogImageUrl(fileId: string): string {
  return `${TECH_BLOG_CDN_BASE_URL}/${encodeURIComponent(fileId)}`;
}

export function buildMarkdownImage(params: { fileId: string; alt?: string }): string {
  return `![${params.alt?.trim() || 'image'}](${buildTechBlogImageUrl(params.fileId)})`;
}

export function insertTextAtRange(value: string, text: string, start: number, end: number): string {
  return `${value.slice(0, start)}${text}${value.slice(end)}`;
}

export function resolveStorageApiUrl(apiBaseUrl: string, path: string): string {
  if (!apiBaseUrl.trim()) {
    return path;
  }

  return `${apiBaseUrl.replace(/\/+$/, '')}${path}`;
}

export function scaleImageDimensions(params: {
  width: number;
  height: number;
  maxLongEdge: number;
}): { width: number; height: number } {
  const longEdge = Math.max(params.width, params.height);

  if (longEdge <= params.maxLongEdge) {
    return { width: params.width, height: params.height };
  }

  const scale = params.maxLongEdge / longEdge;

  return {
    width: Math.round(params.width * scale),
    height: Math.round(params.height * scale),
  };
}

export async function convertImageFileToWebp(
  file: File,
  options: ConvertImageOptions = {},
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.');
  }

  const image = await loadImageSource(file);
  const dimensions = scaleImageDimensions({
    width: image.width,
    height: image.height,
    maxLongEdge: options.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE,
  });
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext('2d');

  if (!context) {
    releaseImageSource(image);
    throw new Error('이미지를 변환할 수 없습니다.');
  }

  context.drawImage(image.source, 0, 0, dimensions.width, dimensions.height);
  releaseImageSource(image);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, TECH_BLOG_IMAGE_CONTENT_TYPE, options.quality ?? DEFAULT_WEBP_QUALITY);
  });

  if (!blob) {
    throw new Error('webp 변환에 실패했습니다.');
  }

  return new File([blob], createWebpFileName(file.name, options.now), {
    type: TECH_BLOG_IMAGE_CONTENT_TYPE,
  });
}

export async function uploadTechBlogImage(
  file: File,
  options: UploadImageOptions = {},
): Promise<UploadedTechBlogImage> {
  const optimizedFile = await convertImageFileToWebp(file, options);
  const upload = await prepareUpload(optimizedFile, options);
  await putFileToStorage(upload, optimizedFile);
  await confirmUpload(upload.fileId, options);

  return {
    fileId: upload.fileId,
    fileName: optimizedFile.name,
    originalName: file.name,
    originalSize: file.size,
    optimizedSize: optimizedFile.size,
  };
}

export async function prepareTechBlogImageUpload(
  file: FileLike,
  request: AuthenticatedUploadRequest = apiFetch,
): Promise<PrepareUploadResult> {
  return request<PrepareUploadResult>('/api/v1/storage/prepare-upload', {
    method: 'POST',
    body: buildPrepareUploadBody(file),
  });
}

export async function confirmTechBlogImageUpload(
  fileId: string,
  request: AuthenticatedUploadRequest = apiFetch,
): Promise<void> {
  await request<void>(`/api/v1/storage/${fileId}/confirm`, {
    method: 'POST',
  });
}

async function prepareUpload(
  file: File,
  options: Pick<UploadImageOptions, 'request'>,
): Promise<PrepareUploadResult> {
  return prepareTechBlogImageUpload(file, options.request ?? apiFetch);
}

async function putFileToStorage(upload: PrepareUploadResult, file: File): Promise<void> {
  const response = await fetch(upload.uploadUrl, {
    method: upload.uploadMethod,
    headers: upload.headers,
    body: file,
  });

  if (!response.ok) {
    throw new Error(`스토리지 업로드에 실패했습니다. (${response.status})`);
  }
}

async function confirmUpload(
  fileId: string,
  options: Pick<UploadImageOptions, 'request'>,
): Promise<void> {
  await confirmTechBlogImageUpload(fileId, options.request ?? apiFetch);
}

async function loadImageSource(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  objectUrl?: string;
}> {
  if ('createImageBitmap' in globalThis) {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
    };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;
  await image.decode();

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    objectUrl,
  };
}

function releaseImageSource(image: { source: CanvasImageSource; objectUrl?: string }): void {
  if ('close' in image.source && typeof image.source.close === 'function') {
    image.source.close();
  }

  if (image.objectUrl) {
    URL.revokeObjectURL(image.objectUrl);
  }
}
