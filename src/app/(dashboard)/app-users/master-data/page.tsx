import { redirect } from 'next/navigation';

/** Master Data moved to User Profile. */
export default function MasterDataPage() {
  redirect('/user-analytics');
}
