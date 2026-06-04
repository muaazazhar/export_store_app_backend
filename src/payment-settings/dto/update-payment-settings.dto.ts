import { PaymentSettingsInput } from '../payment-settings.types';

export class UpdatePaymentSettingsDto implements PaymentSettingsInput {
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
}
