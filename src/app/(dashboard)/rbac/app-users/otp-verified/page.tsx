import { redirect } from 'next/navigation';

/** Legacy path → App Users OTP Verified */
export default function LegacyOtpVerifiedRedirect() {
  redirect('/app-users/otp-verified');
}
