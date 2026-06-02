import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  buildVerificationEmailHtml,
  buildVerificationEmailText,
} from './templates/verification-email.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    if (!host || !user || !pass) {
      throw new Error('SMTP_HOST, SMTP_USER and SMTP_PASS must be configured');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    return this.transporter;
  }

  async sendVerificationEmail(to: string, code: string): Promise<void> {
    const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim();
    const appName = process.env.APP_NAME?.trim() || 'Store App';
    const expiryMinutes = Number(
      process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY_MINUTES ?? 15,
    );

    if (!from) {
      throw new Error('SMTP_FROM or SMTP_USER must be configured');
    }

    const templateParams = { appName, code, expiryMinutes };

    const mail = {
      from: `"${appName}" <${from}>`,
      to,
      subject: `${appName} — Verify your email`,
      text: buildVerificationEmailText(templateParams),
      html: buildVerificationEmailHtml(templateParams),
    };

    try {
      await this.getTransporter().sendMail(mail);
      this.logger.log(`Verification email sent to ${this.maskEmail(to)}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${this.maskEmail(to)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) {
      return '[invalid-email]';
    }
    const visible = local.slice(0, 2);
    return `${visible}***@${domain}`;
  }
}
