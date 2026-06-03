import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  buildVerificationEmailHtml,
  buildVerificationEmailText,
} from './templates/verification-email.template';

const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS ?? 15_000);

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  async sendVerificationEmail(to: string, code: string): Promise<void> {
    const appName = process.env.APP_NAME?.trim() || 'Store App';
    const expiryMinutes = Number(
      process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY_MINUTES ?? 15,
    );
    const templateParams = { appName, code, expiryMinutes };
    const subject = `${appName} — Verify your email`;
    const html = buildVerificationEmailHtml(templateParams);
    const text = buildVerificationEmailText(templateParams);

    const brevoApiKey = process.env.BREVO_API_KEY?.trim();
    if (brevoApiKey) {
      await this.sendViaBrevoApi(brevoApiKey, to, subject, html, text, appName);
      return;
    }

    await this.sendViaSmtp(to, subject, html, text, appName);
  }

  /** HTTPS API — works on Railway (SMTP ports are often blocked). */
  private async sendViaBrevoApi(
    apiKey: string,
    to: string,
    subject: string,
    html: string,
    text: string,
    appName: string,
  ): Promise<void> {
    const fromEmail =
      process.env.SMTP_FROM?.trim() || process.env.BREVO_SENDER_EMAIL?.trim();
    if (!fromEmail) {
      throw new Error('SMTP_FROM or BREVO_SENDER_EMAIL must be configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SMTP_TIMEOUT_MS);

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: appName, email: fromEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        this.logger.warn(
          `Brevo API rejected email (${response.status}): ${body.slice(0, 200)}`,
        );
        throw new Error(`Brevo API error: HTTP ${response.status}`);
      }

      this.logger.log(
        `Verification email sent via Brevo API to ${this.maskEmail(to)}`,
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Email provider request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async sendViaSmtp(
    to: string,
    subject: string,
    html: string,
    text: string,
    appName: string,
  ): Promise<void> {
    const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim();
    if (!from) {
      throw new Error('SMTP_FROM or SMTP_USER must be configured');
    }

    const mail = {
      from: `"${appName}" <${from}>`,
      to,
      subject,
      text,
      html,
    };

    try {
      await this.getTransporter().sendMail(mail);
      this.logger.log(`Verification email sent via SMTP to ${this.maskEmail(to)}`);
    } catch (error) {
      const hint =
        process.env.NODE_ENV === 'production'
          ? ' (SMTP may be blocked on cloud hosts — set BREVO_API_KEY for HTTPS delivery)'
          : '';
      this.logger.error(
        `Failed to send verification email via SMTP to ${this.maskEmail(to)}${hint}`,
        error instanceof Error ? error.message : undefined,
      );
      throw error;
    }
  }

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    if (!host || !user || !pass) {
      throw new Error(
        'Configure BREVO_API_KEY (recommended on Railway) or SMTP_HOST, SMTP_USER, SMTP_PASS',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
    });

    return this.transporter;
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
