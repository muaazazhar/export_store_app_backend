import { BadRequestException } from '@nestjs/common';
import { isValidUuid } from '../common/validation/uuid.util';

export type CreateOrderItemInput = {
  productId: string;
  quantity: number;
};

export type ParsedCreateOrderPayload = {
  address: string;
  paymentMethod: string;
  walletProvider: string | null;
  paymentReference: string | null;
  items: CreateOrderItemInput[];
};

function parseItemsField(items: unknown): CreateOrderItemInput[] {
  let parsed: unknown = items;
  if (typeof items === 'string') {
    try {
      parsed = JSON.parse(items);
    } catch {
      throw new BadRequestException('items must be valid JSON');
    }
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new BadRequestException('At least one order item is required');
  }

  return parsed.map((item, index) => {
    const raw = item as { productId?: unknown; quantity?: unknown };
    const productId = normalizeProductId(raw.productId, index);
    const quantity = Number(raw.quantity);
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException(
        `items[${index}].quantity must be a positive integer`,
      );
    }
    return { productId, quantity };
  });
}

function normalizeProductId(value: unknown, index: number): string {
  if (value === undefined || value === null || value === '') {
    throw new BadRequestException(`items[${index}].productId is required`);
  }

  const asString = String(value).trim();
  if (!isValidUuid(asString)) {
    throw new BadRequestException(
      `items[${index}].productId must be a valid UUID`,
    );
  }
  return asString;
}

export function parseCreateOrderBody(body: Record<string, unknown>): ParsedCreateOrderPayload {
  const address = String(body.address ?? '').trim();
  if (!address) {
    throw new BadRequestException('Delivery address is required');
  }

  const paymentMethod = String(body.paymentMethod ?? '')
    .trim()
    .toLowerCase();
  if (!paymentMethod) {
    throw new BadRequestException('Payment method is required');
  }

  const walletProviderRaw = body.walletProvider ?? body.wallet_provider;
  const walletProvider =
    walletProviderRaw === undefined || walletProviderRaw === null
      ? null
      : String(walletProviderRaw).trim().toLowerCase() || null;

  const paymentReferenceRaw =
    body.paymentReference ?? body.payment_reference ?? null;
  const paymentReference =
    paymentReferenceRaw === null || paymentReferenceRaw === undefined
      ? null
      : String(paymentReferenceRaw).trim() || null;

  return {
    address,
    paymentMethod,
    walletProvider,
    paymentReference,
    items: parseItemsField(body.items),
  };
}

export function normalizePaymentMethod(
  paymentMethod: string,
  walletProvider: string | null,
): { paymentMethod: string; walletProvider: string | null } {
  if (paymentMethod === 'card') {
    return { paymentMethod: 'credit_debit_card', walletProvider: null };
  }
  if (paymentMethod === 'easypaisa' || paymentMethod === 'jazzcash') {
    return { paymentMethod: 'wallet', walletProvider: paymentMethod };
  }
  if (paymentMethod === 'wallet') {
    return { paymentMethod: 'wallet', walletProvider };
  }
  return { paymentMethod, walletProvider: null };
}
