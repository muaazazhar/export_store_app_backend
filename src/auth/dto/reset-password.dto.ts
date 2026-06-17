export class ResetPasswordDto {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}
