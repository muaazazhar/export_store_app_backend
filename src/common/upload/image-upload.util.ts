import { BadRequestException } from '@nestjs/common';
import { UploadedImageFile } from './uploaded-file.type';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function validateImageFile(
  file?: UploadedImageFile,
  required = true,
): void {
  if (!file) {
    if (required) {
      throw new BadRequestException('Image file is required');
    }
    return;
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException(
      'Invalid image type. Allowed types: image/jpeg, image/png, image/webp',
    );
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new BadRequestException(
      `Image size exceeds ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB limit. Please upload a file smaller than ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB.`,
    );
  }
}
