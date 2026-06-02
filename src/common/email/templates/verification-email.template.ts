export interface VerificationEmailTemplateParams {
  appName: string;
  code: string;
  expiryMinutes: number;
}

export function buildVerificationEmailHtml(
  params: VerificationEmailTemplateParams,
): string {
  const { appName, code, expiryMinutes } = params;
  const year = new Date().getFullYear();
  const digits = code.split('').join(' ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f7fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
          <!-- Header -->
          <tr>
            <td style="padding:0 0 20px 0;text-align:center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#0a7ea4 0%,#0d9488 100%);border-radius:16px 16px 0 0;">
                <tr>
                  <td style="padding:28px 24px;text-align:center;">
                    <div style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:12px;background:rgba(255,255,255,0.2);font-size:24px;margin-bottom:12px;">🛒</div>
                    <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${escapeHtml(appName)}</h1>
                    <p style="margin:8px 0 0 0;font-size:14px;color:rgba(255,255,255,0.9);">Verify your email to get started</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body card -->
          <tr>
            <td style="background-color:#ffffff;border:1px solid #cbd5e1;border-top:none;border-radius:0 0 16px 16px;padding:32px 28px;box-shadow:0 4px 24px rgba(10,126,164,0.08);">
              <p style="margin:0 0 8px 0;font-size:16px;line-height:1.5;color:#000000;">Hello,</p>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#64748b;">
                Thanks for signing up! Enter this verification code in the app to confirm your email and complete your account setup.
              </p>
              <!-- Code box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;">
                <tr>
                  <td align="center" style="background-color:#eef3fb;border:2px dashed #0a7ea4;border-radius:12px;padding:24px 16px;">
                    <p style="margin:0 0 8px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:#0a7ea4;">Your verification code</p>
                    <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:${digits.length > 7 ? '6px' : '10px'};color:#0a7ea4;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;">${escapeHtml(code)}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.5;color:#64748b;text-align:center;">
                This code expires in <strong style="color:#0a7ea4;">${expiryMinutes} minutes</strong>.
              </p>
              <!-- CTA hint -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding:16px 0 0 0;">
                    <span style="display:inline-block;padding:10px 20px;background-color:#0a7ea4;color:#ffffff;font-size:14px;font-weight:600;border-radius:8px;text-decoration:none;">Open the app and enter your code</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 8px 0 8px;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.5;color:#64748b;">
                If you didn't create an account, you can safely ignore this email.
              </p>
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                © ${year} ${escapeHtml(appName)}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildVerificationEmailText(
  params: VerificationEmailTemplateParams,
): string {
  const { appName, code, expiryMinutes } = params;
  return [
    `${appName} - Email Verification`,
    '',
    'Hello,',
    '',
    'Thanks for signing up! Use the verification code below in the app:',
    '',
    `Code: ${code}`,
    '',
    `This code expires in ${expiryMinutes} minutes.`,
    '',
    "If you didn't create an account, you can ignore this email.",
  ].join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
