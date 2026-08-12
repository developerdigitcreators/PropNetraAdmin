import { redirect } from 'next/navigation';

/** Legacy path → nested App Users Master Data */
export default function LegacyAppUsersRedirect() {
  redirect('/app-users/master-data');
}
