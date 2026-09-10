import { redirect } from 'next/navigation';

/** Legacy path → User Profile (former Master Data). */
export default function LegacyMasterDataRedirect() {
  redirect('/user-analytics');
}
