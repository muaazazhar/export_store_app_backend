export type PaymentSettingsResponse = {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string | null;
  instructions: string | null;
  easypaisaNumber: string | null;
  jazzcashNumber: string | null;
  freeDeliveryEnabled: boolean;
  deliveryCharge: number;
};

export type PaymentSettingsInput = {
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  iban?: string | null;
  instructions?: string | null;
  easypaisaNumber?: string | null;
  jazzcashNumber?: string | null;
  freeDeliveryEnabled?: boolean;
  deliveryCharge?: number;
  account_title?: string;
  account_number?: string;
  easypaisa_number?: string;
  jazzcash_number?: string;
  free_delivery_enabled?: boolean;
  delivery_charge?: number;
};
