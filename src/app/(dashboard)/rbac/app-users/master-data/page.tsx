import { redirect } from 'next/navigation';

/** Legacy path → App Users Master Data */
export default function LegacyMasterDataRedirect() {
  redirect('/app-users/master-data');
}
