"use client";

import { Input } from "@/components/ui/input";
import {
  applyProjectPrefixPreview,
  stripProjectPrefixForEdit,
} from "@/lib/developer-form-limits";
import {
  CreateFormCatalogSection,
  type CreateFormCatalogFields,
} from "@/modules/listings/create-form-catalog-section";

type Props = {
  propertyTypeId: string;
  disabled?: boolean;
  mode: "create" | "edit";
  projectPrefix: string | null | undefined;
  propertySuffix: string;
  onPropertySuffixChange: (suffix: string) => void;
  propertyNameId: string;
  catalogFields: CreateFormCatalogFields;
  onCatalogFieldsChange: (patch: Partial<CreateFormCatalogFields>) => void;
  onError?: (message: string) => void;
  onCatalogWarning?: (message: string) => void;
  locationSelectedLabel?: string;
  microMarketSelectedLabel?: string;
  stateSelectedLabel?: string;
  citySelectedLabel?: string;
  postFormUserId?: string;
  locationEnabledBeforePropertyType?: boolean;
  suppressPrefillForPropertyId?: string;
};

export function DeveloperUserListingShell({
  propertyTypeId,
  disabled,
  mode,
  projectPrefix,
  propertySuffix,
  onPropertySuffixChange,
  propertyNameId,
  catalogFields,
  onCatalogFieldsChange,
  onError,
  onCatalogWarning,
  locationSelectedLabel,
  microMarketSelectedLabel,
  stateSelectedLabel,
  citySelectedLabel,
  postFormUserId,
  locationEnabledBeforePropertyType = true,
  suppressPrefillForPropertyId,
}: Props) {
  const preview = applyProjectPrefixPreview(projectPrefix, propertySuffix);

  return (
    <>
      <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Location</h2>
        <CreateFormCatalogSection
          propertyTypeId={propertyTypeId}
          forSaleInLocation={false}
          hidePropertyName
          disabled={disabled}
          mode={mode}
          suppressPrefillForPropertyId={suppressPrefillForPropertyId}
          fields={catalogFields}
          onFieldsChange={onCatalogFieldsChange}
          onError={onError}
          onCatalogWarning={onCatalogWarning}
          locationSelectedLabel={locationSelectedLabel}
          microMarketSelectedLabel={microMarketSelectedLabel}
          stateSelectedLabel={stateSelectedLabel}
          citySelectedLabel={citySelectedLabel}
          locationEnabledBeforePropertyType={locationEnabledBeforePropertyType}
          postFormUserId={postFormUserId}
        />
      </div>

      <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Property detail</h2>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Project name</label>
            <div className="flex flex-wrap items-stretch gap-0 overflow-hidden rounded-md border border-gray-200 bg-white">
              {projectPrefix ? (
                <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">
                  {projectPrefix}
                </span>
              ) : null}
              <Input
                className="min-w-[12rem] flex-1 border-0 shadow-none focus-visible:ring-0"
                value={propertySuffix}
                disabled={disabled}
                onChange={(e) =>
                  onPropertySuffixChange(
                    stripProjectPrefixForEdit(projectPrefix, e.target.value),
                  )
                }
                placeholder="Type project name suffix"
              />
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-2">
            <p className="text-xs font-medium text-gray-500">Published name preview</p>
            <p className="text-sm font-medium text-gray-900">
              {preview || "—"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
