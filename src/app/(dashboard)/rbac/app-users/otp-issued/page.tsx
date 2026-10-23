import { redirect } from 'next/navigation';

/** Legacy path → App Users OTP Issued */
export default function LegacyOtpIssuedRedirect() {
  redirect('/app-users/otp-issued');
}
