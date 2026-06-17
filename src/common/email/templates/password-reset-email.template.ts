type PasswordResetEmailParams = {
  appName: string;
  code: string;
  expiryMinutes: number;
};

export function buildPasswordResetEmailHtml(
  params: PasswordResetEmailParams,
): string {
  return `
    <p>Use this code to reset your ${params.appName} password:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${params.code}</p>
    <p>This code expires in ${params.expiryMinutes} minutes.</p>
    <p>If you did not request a password reset, you can ignore this email.</p>
  `.trim();
}

export function buildPasswordResetEmailText(
  params: PasswordResetEmailParams,
): string {
  return [
    `Your ${params.appName} password reset code: ${params.code}`,
    `Expires in ${params.expiryMinutes} minutes.`,
    'If you did not request this, ignore this email.',
  ].join('\n');
}
