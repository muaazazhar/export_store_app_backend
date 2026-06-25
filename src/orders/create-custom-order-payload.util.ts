import { BadRequestException } from '@nestjs/common';

export const CUSTOM_ORDER_ADDRESS_MAX_LENGTH = 300;
export const CUSTOM_ORDER_ITEM_NAME_MAX_LENGTH = 200;
export const CUSTOM_ORDER_ITEMS_MIN = 1;
export const CUSTOM_ORDER_ITEMS_MAX = 30;

export type ParsedCreateCustomOrderPayload = {
  address: string;
  paymentMethod: 'cash_on_delivery';
  customItems: string[];
};

function parseCustomItemsField(customItems: unknown): string[] {
  if (!Array.isArray(customItems)) {
    throw new BadRequestException('customItems must be an array');
  }

  if (
    customItems.length < CUSTOM_ORDER_ITEMS_MIN ||
    customItems.length > CUSTOM_ORDER_ITEMS_MAX
  ) {
    throw new BadRequestException(
      `customItems must contain between ${CUSTOM_ORDER_ITEMS_MIN} and ${CUSTOM_ORDER_ITEMS_MAX} items`,
    );
  }

  return customItems.map((item, index) => {
    if (typeof item !== 'string') {
      throw new BadRequestException(
        `customItems[${index}] must be a non-empty string`,
      );
    }

    const name = item.trim();
    if (!name) {
      throw new BadRequestException(
        `customItems[${index}] must be a non-empty string`,
      );
    }

    if (name.length > CUSTOM_ORDER_ITEM_NAME_MAX_LENGTH) {
      throw new BadRequestException(
        `customItems[${index}] must be at most ${CUSTOM_ORDER_ITEM_NAME_MAX_LENGTH} characters`,
      );
    }

    return name;
  });
}

export function parseCreateCustomOrderBody(
  body: Record<string, unknown>,
): ParsedCreateCustomOrderPayload {
  const address = String(body.address ?? '').trim();
  if (!address) {
    throw new BadRequestException('Delivery address is required');
  }
  if (address.length > CUSTOM_ORDER_ADDRESS_MAX_LENGTH) {
    throw new BadRequestException(
      `address must be at most ${CUSTOM_ORDER_ADDRESS_MAX_LENGTH} characters`,
    );
  }

  const paymentMethod = String(body.paymentMethod ?? '')
    .trim()
    .toLowerCase();
  if (paymentMethod !== 'cash_on_delivery') {
    throw new BadRequestException(
      'Custom orders only support cash_on_delivery payment',
    );
  }

  return {
    address,
    paymentMethod: 'cash_on_delivery',
    customItems: parseCustomItemsField(body.customItems),
  };
}
