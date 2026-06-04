import { BadRequestException } from '@nestjs/common';
import { ALLOWED_IMAGE_MIME_TYPES, sanitizeFilename } from './image-upload.util';

export const MAX_PAYMENT_SCREENSHOT_BYTES = 5 * 1024 * 1024;

export type PaymentScreenshotFile = {
  mimetype: string;
  size: number;
  originalname: string;
  buffer: Buffer;
};

export function validatePaymentScreenshotFile(
  file?: PaymentScreenshotFile,
  required = false,
): void {
  if (!file) {
    if (required) {
      throw new BadRequestException('paymentScreenshot file is required');
    }
    return;
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException(
      'Invalid image type. Allowed types: image/jpeg, image/png, image/webp',
    );
  }

  if (file.size > MAX_PAYMENT_SCREENSHOT_BYTES) {
    throw new BadRequestException(
      'Payment screenshot exceeds 5MB limit',
    );
  }
}

export function toPaymentScreenshotColumns(file: PaymentScreenshotFile): {
  paymentScreenshotBlob: Buffer;
  paymentScreenshotMime: string;
  paymentScreenshotFilename: string;
} {
  validatePaymentScreenshotFile(file, true);
  return {
    paymentScreenshotBlob: file.buffer,
    paymentScreenshotMime: file.mimetype,
    paymentScreenshotFilename: sanitizeFilename(file.originalname),
  };
}
