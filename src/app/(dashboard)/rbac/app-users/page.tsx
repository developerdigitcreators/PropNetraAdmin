import { redirect } from 'next/navigation';

/** Legacy path → App Users (OTP Issued default, or first allowed tab) */
export default function LegacyAppUsersRedirect() {
  redirect('/app-users');
}
