export type PaymentSettingsResponse = {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string | null;
  instructions: string | null;
  easypaisaNumber: string | null;
  jazzcashNumber: string | null;
};

export type PaymentSettingsInput = {
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  iban?: string | null;
  instructions?: string | null;
  easypaisaNumber?: string | null;
  jazzcashNumber?: string | null;
  account_title?: string;
  account_number?: string;
  easypaisa_number?: string;
  jazzcash_number?: string;
};
