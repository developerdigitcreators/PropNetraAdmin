import type { ReactNode } from "react";
import type {
  CreateFormField,
  CreateFormSchema,
} from "@/services/listings.service";

export function isSelectType(type: string) {
  const t = type.toLowerCase();
  return (
    t.includes("select") ||
    t.includes("dropdown") ||
    t === "enum" ||
    t === "radio" ||
    t === "multi_select"
  );
}

export function isBooleanType(type: string) {
  const t = type.toLowerCase();
  return (
    t === "boolean" || t === "switch" || t === "checkbox" || t === "toggle"
  );
}

export function isNumberType(type: string) {
  const t = type.toLowerCase();
  return (
    t === "number" || t === "integer" || t === "decimal" || t === "currency"
  );
}

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function isPossessionModule(key: string, label: string) {
  return (
    normalizeKey(key) === "possession" || normalizeKey(label) === "possession"
  );
}

export function isPossessionMonthField(field: CreateFormField) {
  const key = normalizeKey(field.key);
  const label = normalizeKey(field.label);
  return key === "month" || key.endsWith("_month") || label === "month";
}

export function isPossessionYearField(field: CreateFormField) {
  const key = normalizeKey(field.key);
  const label = normalizeKey(field.label);
  return key === "year" || key.endsWith("_year") || label === "year";
}

export function dependsOnChecked(field: CreateFormField) {
  return field.dependsOn?.value === true;
}

export function percentFieldsFor(
  schema: CreateFormSchema | null,
  parentKey: string,
): CreateFormField[] {
  const fields = [
    ...(schema?.fields ?? []),
    ...(schema?.modules ?? []).flatMap((mod) => mod.fields),
  ];
  return fields.filter(
    (field) => dependsOnChecked(field) && field.dependsOn?.field === parentKey,
  );
}

export function isCheckedDetail(value: string | undefined) {
  return value === "true" || value === "1" || value === "yes";
}

export function allSchemaFields(schema: CreateFormSchema | null): CreateFormField[] {
  if (!schema) return [];
  return [
    ...(schema.fields ?? []),
    ...(schema.modules ?? []).flatMap((mod) => mod.fields),
  ];
}

export function findSchemaField(
  schema: CreateFormSchema | null,
  key: string,
): CreateFormField | undefined {
  return allSchemaFields(schema).find((f) => f.key === key);
}

export function isComplexFieldType(type: string) {
  const t = type.toLowerCase();
  return (
    t === "team_members" ||
    t === "media_upload" ||
    t === "file_upload" ||
    t === "media_gallery" ||
    t === "brochure" ||
    t === "attach_layouts" ||
    t === "site_layout" ||
    t === "floor_plans" ||
    t === "available_units" ||
    t === "table" ||
    t === "geo" ||
    t === "location_advantage" ||
    t === "icon_options" ||
    t === "multi_select" ||
    t.includes("header_media") ||
    t.includes("banner") ||
    t === "dev_header_media"
  );
}

export function isTextareaType(type: string) {
  return type.toLowerCase() === "textarea";
}

export function isMediaGalleryType(type: string) {
  const t = type.toLowerCase();
  return t === "media_gallery" || t.includes("header_media");
}

/** Avoid rendering modules + flatMap duplicate "Additional fields". */
export function resolveDeveloperDetailModules(schema: CreateFormSchema | null) {
  if (!schema) return [];
  if (schema.modules.length > 0) return schema.modules;
  if (schema.fields.length > 0) {
    return [{ key: "details", label: "Listing details", fields: schema.fields }];
  }
  return [];
}

/** Map stored label/slug to select option value. */
export function coalesceSelectDetailValue(
  field: CreateFormField,
  stored: string,
): string {
  const raw = String(stored || "").trim();
  if (!raw || !field.options?.length) return raw;
  const lower = raw.toLowerCase();
  const norm = (s: string) => s.toLowerCase().replace(/[\s-]+/g, "_");
  const rawNorm = norm(raw);
  const byValue = field.options.find((o) => o.value.toLowerCase() === lower);
  if (byValue) return byValue.value;
  const byLabel = field.options.find(
    (o) => o.label.trim().toLowerCase() === lower,
  );
  if (byLabel) return byLabel.value;
  const byNormValue = field.options.find((o) => norm(o.value) === rawNorm);
  if (byNormValue) return byNormValue.value;
  const byNormLabel = field.options.find((o) => norm(o.label) === rawNorm);
  if (byNormLabel) return byNormLabel.value;
  const slug = lower.replace(/\s+/g, "_");
  const bySlug = field.options.find((o) => o.value.toLowerCase() === slug);
  return bySlug?.value ?? raw;
}

export function schemaSelectDisplayLabel(
  field: CreateFormField,
  stored: string,
): string {
  const coerced = coalesceSelectDetailValue(field, stored);
  const opt = field.options?.find(
    (o) =>
      o.value === coerced ||
      o.value.toLowerCase() === coerced.toLowerCase() ||
      normSelectKey(o.value) === normSelectKey(coerced),
  );
  return opt?.label ?? coerced;
}

function normSelectKey(s: string) {
  return s.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function catalogOptionDisplayName(
  options: Array<{ id: string; name: string }>,
  id: string,
  fallback?: string | null,
): string {
  if (!id) return fallback?.trim() || "";
  return options.find((o) => o.id === id)?.name ?? fallback?.trim() ?? "";
}

const FALLBACK_COMPLEX_KEYS = [
  "dev_header_media",
  "dev_geo_location",
  "geo_location",
  "dev_available_units",
  "dev_attach_layouts",
  "dev_site_layout",
  "dev_specification",
  "dev_gallery",
  "dev_amenities",
  "dev_location_advantage",
  "dev_brochure",
  "dev_team_members",
];

export function extractComplexDynamic(
  schema: CreateFormSchema | null,
  dynamic: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of allSchemaFields(schema)) {
    if (!isComplexFieldType(field.type)) continue;
    const v = dynamic[field.key];
    if (v !== undefined && v !== null) out[field.key] = v;
  }
  if (!schema) {
    for (const key of FALLBACK_COMPLEX_KEYS) {
      const v = dynamic[key];
      if (v !== undefined && v !== null) out[key] = v;
    }
    if (dynamic.geo_location && !out.dev_geo_location) {
      out.dev_geo_location = dynamic.geo_location;
    }
  }
  if (Array.isArray(dynamic._tableRows)) out._tableRows = dynamic._tableRows;
  if (dynamic.floor_pricing) out.floor_pricing = dynamic.floor_pricing;
  return out;
}

export function detailsFromDynamic(
  schema: CreateFormSchema,
  dynamic: Record<string, unknown>,
): Record<string, string> {
  const fields = allSchemaFields(schema);
  const next: Record<string, string> = {};
  for (const field of fields) {
    if (isComplexFieldType(field.type)) continue;
    const raw = dynamic[field.key];
    if (raw === undefined || raw === null) continue;
    if (isBooleanType(field.type)) {
      const on = isCheckedDetail(
        String(raw === true ? "true" : raw ?? ""),
      );
      next[field.key] = on ? "true" : "false";
      if (!on) continue;
      for (const percent of fields) {
        if (!dependsOnChecked(percent) || percent.dependsOn?.field !== field.key)
          continue;
        const pRaw = dynamic[percent.key];
        if (typeof pRaw === "number" && Number.isFinite(pRaw))
          next[percent.key] = String(pRaw);
        else if (typeof pRaw === "string" && pRaw.trim())
          next[percent.key] = pRaw.replace("%", "").trim();
      }
      continue;
    }
    if (typeof raw === "number") next[field.key] = String(raw);
    else if (typeof raw === "string") next[field.key] = raw;
  }
  return next;
}

export function seedStringDetailsFromDynamic(
  schema: CreateFormSchema,
  dynamic: Record<string, unknown>,
): Record<string, string> {
  const next = detailsFromDynamic(schema, dynamic);
  for (const field of allSchemaFields(schema)) {
    if (isComplexFieldType(field.type)) continue;
    if (next[field.key] !== undefined) continue;
    const v = dynamic[field.key];
    if (v === undefined || v === null) continue;
    if (typeof v === "boolean") next[field.key] = v ? "true" : "false";
    else if (typeof v === "number") next[field.key] = String(v);
    else if (typeof v === "string") {
      next[field.key] = isSelectType(field.type)
        ? coalesceSelectDetailValue(field, v)
        : v;
    }
  }
  for (const field of allSchemaFields(schema)) {
    if (!isSelectType(field.type) || next[field.key] === undefined) continue;
    next[field.key] = coalesceSelectDetailValue(field, next[field.key]);
  }
  return next;
}

const SKIP_DEVELOPER_DETAIL_KEYS = new Set([
  "category",
  "category_id",
  "building_type",
  "building_type_id",
  "property_type",
  "property_type_id",
  "property_name",
  "property_name_id",
  "location",
  "location_id",
  "micro_market",
  "micro_market_id",
  "micromarket",
  "city",
  "city_id",
  "state",
  "state_id",
  "price",
  "price_on_request",
]);

export function filterDeveloperRenderableFields(fields: CreateFormField[]) {
  return fields.filter(
    (field) =>
      field.slot !== "banner" &&
      field.type !== "banner" &&
      !SKIP_DEVELOPER_DETAIL_KEYS.has(normalizeKey(field.key)),
  );
}

function isBannerOnlyModule(mod: { key: string; label: string }) {
  const k = normalizeKey(mod.key);
  const l = normalizeKey(mod.label);
  return k === "banner" || l === "banner";
}

export function developerDetailModulesToRender(schema: CreateFormSchema | null) {
  return resolveDeveloperDetailModules(schema)
    .map((mod) => ({
      ...mod,
      fields: filterDeveloperRenderableFields(mod.fields),
    }))
    .filter((mod) => !isBannerOnlyModule(mod) && mod.fields.length > 0);
}

export function buildDetailsPayloadFromStrings(
  schema: CreateFormSchema | null,
  details: Record<string, string>,
  complex: Record<string, unknown>,
): Record<string, unknown> {
  const detailsPayload: Record<string, unknown> = { ...complex };
  for (const [key, value] of Object.entries(details)) {
    if (value === "" || value == null) continue;
    const field = findSchemaField(schema, key);
    if (field?.slot === "banner" || field?.type === "banner") continue;
    if (field && dependsOnChecked(field)) {
      const parentKey = field.dependsOn?.field || "";
      if (!isCheckedDetail(details[parentKey])) continue;
    }
    if (value === "true") detailsPayload[key] = true;
    else if (value === "false") detailsPayload[key] = false;
    else if (
      /^-?\d+(\.\d+)?$/.test(value.replace("%", "")) &&
      field &&
      isNumberType(field.type) &&
      !isPossessionMonthField(field) &&
      !isPossessionYearField(field)
    )
      detailsPayload[key] = Number(value.replace("%", ""));
    else detailsPayload[key] = value;
  }
  return detailsPayload;
}

export function renderModuleFields(
  mod: { key: string; label: string; fields: CreateFormField[] },
  renderField: (field: CreateFormField) => ReactNode,
) {
  if (!isPossessionModule(mod.key, mod.label)) {
    return renderSchemaFields(mod.fields, renderField);
  }
  const month = mod.fields.find(isPossessionMonthField);
  const year = mod.fields.find(isPossessionYearField);
  const rest = mod.fields.filter((field) => field !== month && field !== year);
  return (
    <>
      {month && year ? (
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
          {renderField(month)}
          {renderField(year)}
        </div>
      ) : (
        <>
          {month ? renderField(month) : null}
          {year ? renderField(year) : null}
        </>
      )}
      {rest.length ? renderSchemaFields(rest, renderField) : null}
    </>
  );
}

export function renderSchemaFields(
  fields: CreateFormField[],
  renderField: (field: CreateFormField) => ReactNode,
) {
  const consumed = new Set<string>();
  const nodes: ReactNode[] = [];
  for (const field of fields) {
    if (consumed.has(field.key)) continue;
    if (isBooleanType(field.type)) {
      const percent = fields.find(
        (item) =>
          dependsOnChecked(item) &&
          item.dependsOn?.field === field.key &&
          isNumberType(item.type),
      );
      if (percent) {
        consumed.add(field.key);
        consumed.add(percent.key);
        nodes.push(
          <div
            key={field.key}
            className="flex flex-wrap items-center gap-3 sm:col-span-2"
          >
            {renderField(field)}
            {renderField(percent)}
          </div>,
        );
        continue;
      }
    }
    if (dependsOnChecked(field) && isNumberType(field.type)) {
      const parentInList = fields.some((item) => item.key === field.dependsOn?.field);
      if (parentInList) continue;
    }
    consumed.add(field.key);
    nodes.push(renderField(field));
  }
  return nodes;
}
