import { OptionsManager } from '@/modules/listings/options-manager';

export default function ListingOptionsPage() {
  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dynamic Dropdown Options</h1>
          <p className="text-gray-500 mt-1">Manage selectable options for form modules (e.g. Amenities, Facing).</p>
        </div>
      </div>

      <OptionsManager />
    </div>
  );
}
