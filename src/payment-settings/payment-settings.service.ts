import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentSettings } from '../entities/payment-settings.entity';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import {
  PaymentSettingsInput,
  PaymentSettingsResponse,
} from './payment-settings.types';

@Injectable()
export class PaymentSettingsService {
  constructor(
    @InjectRepository(PaymentSettings)
    private readonly settingsRepository: Repository<PaymentSettings>,
  ) {}

  private toResponse(settings: PaymentSettings): PaymentSettingsResponse {
    return {
      bankName: settings.bankName ?? '',
      accountTitle: settings.accountTitle ?? '',
      accountNumber: settings.accountNumber ?? '',
      iban: settings.iban,
      instructions: settings.instructions,
      easypaisaNumber: settings.easypaisaNumber,
      jazzcashNumber: settings.jazzcashNumber,
    };
  }

  isBankTransferConfigured(settings: PaymentSettings): boolean {
    return Boolean(
      settings.bankName?.trim() &&
        settings.accountTitle?.trim() &&
        settings.accountNumber?.trim(),
    );
  }

  isEasypaisaConfigured(settings: PaymentSettings): boolean {
    return Boolean(settings.easypaisaNumber?.trim());
  }

  isJazzcashConfigured(settings: PaymentSettings): boolean {
    return Boolean(settings.jazzcashNumber?.trim());
  }

  private normalizeInput(
    dto: PaymentSettingsInput,
  ): Partial<PaymentSettingsResponse> {
    const pickString = (value: string | undefined): string | undefined => {
      if (value === undefined) {
        return undefined;
      }
      return value.trim();
    };

    const pickNullable = (
      value: string | null | undefined,
    ): string | null | undefined => {
      if (value === undefined) {
        return undefined;
      }
      if (value === null) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed || null;
    };

    return {
      bankName: pickString(dto.bankName),
      accountTitle: pickString(dto.accountTitle ?? dto.account_title),
      accountNumber: pickString(dto.accountNumber ?? dto.account_number),
      iban: pickNullable(dto.iban),
      instructions: pickNullable(dto.instructions),
      easypaisaNumber: pickNullable(
        dto.easypaisaNumber ?? dto.easypaisa_number,
      ),
      jazzcashNumber: pickNullable(dto.jazzcashNumber ?? dto.jazzcash_number),
    };
  }

  async getOrCreate(): Promise<PaymentSettings> {
    const rows = await this.settingsRepository.find({ take: 1 });
    if (rows.length > 0) {
      return rows[0];
    }

    const created = this.settingsRepository.create({
      bankName: '',
      accountTitle: '',
      accountNumber: '',
      iban: null,
      instructions: null,
      easypaisaNumber: null,
      jazzcashNumber: null,
    });
    return this.settingsRepository.save(created);
  }

  async getSettings(): Promise<PaymentSettingsResponse> {
    const settings = await this.getOrCreate();
    return this.toResponse(settings);
  }

  assertPaymentMethodAllowed(
    settings: PaymentSettings,
    paymentMethod: string,
  ): void {
    if (paymentMethod === 'bank_transfer' && !this.isBankTransferConfigured(settings)) {
      throw new BadRequestException('Bank transfer is not available');
    }
    if (paymentMethod === 'easypaisa' && !this.isEasypaisaConfigured(settings)) {
      throw new BadRequestException('Easypaisa is not available');
    }
    if (paymentMethod === 'jazzcash' && !this.isJazzcashConfigured(settings)) {
      throw new BadRequestException('JazzCash is not available');
    }
  }

  private normalizeForPut(dto: PaymentSettingsInput): PaymentSettingsResponse {
    const partial = this.normalizeInput(dto);
    return {
      bankName: partial.bankName ?? '',
      accountTitle: partial.accountTitle ?? '',
      accountNumber: partial.accountNumber ?? '',
      iban: partial.iban ?? null,
      instructions: partial.instructions ?? null,
      easypaisaNumber: partial.easypaisaNumber ?? null,
      jazzcashNumber: partial.jazzcashNumber ?? null,
    };
  }

  async updateSettings(
    dto: UpdatePaymentSettingsDto,
  ): Promise<PaymentSettingsResponse> {
    const settings = await this.getOrCreate();
    const values = this.normalizeForPut(dto);

    settings.bankName = values.bankName;
    settings.accountTitle = values.accountTitle;
    settings.accountNumber = values.accountNumber;
    settings.iban = values.iban;
    settings.instructions = values.instructions;
    settings.easypaisaNumber = values.easypaisaNumber;
    settings.jazzcashNumber = values.jazzcashNumber;

    const saved = await this.settingsRepository.save(settings);
    return this.toResponse(saved);
  }
}
