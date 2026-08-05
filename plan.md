# PropNetra Admin Panel Architecture Plan

This architecture plan designs an enterprise-grade, config-driven Admin Panel for PropNetra using Next.js (App Router), TypeScript, Zustand, and Zod.

## Interactive Entry & Security Architecture
[ User Login ] ──► [ JWT Auth ] ──► [ Interactive Role Scope Modal ] ──► [ Fetch Permissions ] ──► [ Load Zustand Store ] ──► [ Render Dynamic Sidebar ]

### 1. Interactive Role Scope Modal
Upon successful authentication, an interactive modal prompts the user to select their active workspace context (e.g., Super Admin Global Access, Verification Scope, Listings Manager) if they hold multi-role privileges. For single-role Sub-Admins, the modal auto-resolves their assigned scope without manual intervention.

### 2. Enterprise Security Layer
- **Authentication**: Dual-token strategy (Short-lived Access JWT + HttpOnly Refresh Token).
- **Authorization Gate**: Next.js Middleware intercepts all route requests, checking route meta against the user's granular permission matrix fetched from `/admin/permissions`.
- **UI Component-Level Security**: Wraps action buttons, forms, and tabs with a custom `<PermissionGuard permission="module:action"/>` component to enforce true client-side hide/disable logic matching backend guards.

## Industry-Standard Folder Structure (Next.js App Router)
This structure breaks down code cleanly into atomic components, domain modules, state stores, API services, and Zod validation schemas.

```text
propnetra-admin/
├── public/
│   ├── assets/
│   └── favicon.ico
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Unauthenticated layout group
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/          # Authenticated layout group
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx          # Dashboard analytics
│   │   │   ├── listings/         # Property listings & dynamic schema config
│   │   │   │   ├── config/       # Category / Module Matrix Builder
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── options/      # Dynamic options management
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── locations/        # Location & Property Moderation
│   │   │   │   ├── pending/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── rbac/             # Roles & Permissions Management
│   │   │   │   ├── roles/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── users/
│   │   │   │       └── page.tsx
│   │   │   └── sub-admin/        # Sub-admin delegation & audit logs
│   │   │       └── page.tsx
│   │   ├── api/                  # Local Next.js API routes (BFF pattern if needed)
│   │   ├── global-error.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/               # UI & Layout components
│   │   ├── ui/                   # Atomic UI components (Shadcn / Custom)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── switch.tsx
│   │   │   └── select.tsx
│   │   ├── common/               # Application-wide shared UI
│   │   │   ├── sidebar.tsx       # Dynamic permission-based navigation
│   │   │   ├── navbar.tsx
│   │   │   ├── permission-guard.tsx # Client-side permission wrapper
│   │   │   ├── role-selection-modal.tsx # Active scope selection popup
│   │   │   └── data-table.tsx    # Generic paginated data table
│   │   └── modules/              # Domain-specific UI components
│   │       ├── listings/
│   │       │   ├── config-matrix-table.tsx # Dynamic 21-module configuration matrix
│   │       │   ├── schema-form-render.tsx # Dynamic form renderer driven by JSON schema
│   │       │   └── suggestable-nudge.tsx # Suggestable field prompt builder
│   │       ├── rbac/
│   │       │   ├── permission-matrix.tsx # Dynamic checkbox grid for RBAC
│   │       │   └── assign-role-modal.tsx
│   │       └── locations/
│   │           └── moderation-card.tsx
│   ├── config/                   # Static configuration files
│   │   ├── site.ts
│   │   └── constants.ts
│   ├── hooks/                    # React custom hooks
│   │   ├── use-auth.ts
│   │   ├── use-permissions.ts
│   │   ├── use-form-schema.ts
│   │   └── use-debounce.ts
│   ├── lib/                      # Third-party lib clients & utilities
│   │   ├── axios-client.ts       # Axios instance with interceptors
│   │   ├── utils.ts              # Tailwind clsx / helper utilities
│   │   └── constants.ts
│   ├── services/                 # Backend REST API integration layer
│   │   ├── auth.service.ts
│   │   ├── rbac.service.ts
│   │   ├── listings.service.ts
│   │   └── locations.service.ts
│   ├── store/                    # Zustand global state stores
│   │   ├── use-auth-store.ts     # Token, user state, active role
│   │   ├── use-permission-store.ts # Granted permissions array & lookup map
│   │   └── use-config-matrix-store.ts # Dynamic form schema matrix state
│   ├── types/                    # TypeScript interfaces & types
│   │   ├── rbac.ts
│   │   ├── listings.ts
│   │   ├── locations.ts
│   │   └── api.ts
│   └── validators/               # Zod schema validation models
│       ├── auth.schema.ts
│       ├── rbac.schema.ts
│       ├── config-matrix.schema.ts
│       └── listing-form.schema.ts
├── .env.example
├── .env.local
├── next.config.mjs
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## UI/UX Architecture & Dynamic Design Strategy
### 1. Dynamic Config Matrix Interface (`/listings/config`)
An interactive control center for Super Admins to manage form field rules across Categories, Building Types, and Property Types.

| Module Key | Visibility | Mandatory (is_mandatory) | Suggestable (is_suggestable) | Nudge Message (suggestable_message) | Unit Default |
|---|---|---|---|---|---|
| bhk | ON | YES | OFF (Disabled) | N/A | N/A |
| media_upload | ON | NO | YES | "Properties with photos get 3x more interest!" | N/A |
| area_details | ON | YES | OFF | N/A | sq_ft |
| geo_location | ON | NO | YES | "Adding live location helps buyers find your site" | N/A |

- **Mandatory vs Suggestable Logic**: Selecting *Mandatory* automatically disables *Suggestable* in the UI to prevent illegal state configurations.
- **Batch Save**: Changes accumulate in Zustand store state and bulk-upsert via `PUT /admin/module-config`.

### 2. Granular RBAC Checkbox Grid (`/rbac/roles`)
A matrix allowing admins to configure custom Sub-Admin capabilities across system modules.

```text
Module Name          │ Create │ Read │ Update │ Delete
─────────────────────┼────────┼──────┼────────┼────────
Property Listing     │  [x]   │  [x] │   [x]  │   [ ]
User Management      │  [ ]   │  [x] │   [ ]  │   [ ]
Location Moderation  │  [x]   │  [x] │   [x]  │   [ ]
Role & Permissions   │  [ ]   │  [ ] │   [ ]  │   [ ]
```

## Core State & Validation Stack

### 1. Zustand Store Specification (`use-auth-store.ts` & `use-permission-store.ts`)
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  user: { id: string; email: string; roleScope: string } | null;
  activeRole: string | null;
  accessToken: string | null;
  permissions: Set<string>; // Stored as "module_name:action"
  setAuthData: (user: any, token: string, permissions: string[]) => void;
  setActiveRole: (role: string) => void;
  hasPermission: (moduleName: string, action: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      activeRole: null,
      accessToken: null,
      permissions: new Set(),
      setAuthData: (user, token, permissions) =>
        set({
          user,
          accessToken: token,
          permissions: new Set(permissions),
        }),
      setActiveRole: (role) => set({ activeRole: role }),
      hasPermission: (moduleName, action) => {
        const perms = get().permissions;
        return perms.has(`${moduleName}:${action}`) || perms.has('ALL:ALL');
      },
      logout: () => set({ user: null, accessToken: null, permissions: new Set(), activeRole: null }),
    }),
    {
      name: 'propnetra-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

### 2. Dynamic Schema Validation via Zod (`config-matrix.schema.ts`)
```typescript
import { z } from 'zod';

export const ModuleConfigRowSchema = z.object({
  categoryId: z.string().uuid(),
  buildingTypeId: z.string().uuid().nullable(),
  propertyTypeId: z.string().uuid().nullable(),
  moduleId: z.string().uuid(),
  isVisible: z.boolean(),
  isMandatory: z.boolean(),
  isSuggestable: z.boolean(),
  suggestableMessage: z.string().nullable(),
  unitDefault: z.string().nullable(),
}).refine((data) => !(data.isMandatory && data.isSuggestable), {
  message: "A field cannot be both mandatory and suggestable.",
  path: ["isSuggestable"],
});

export const BatchConfigSchema = z.array(ModuleConfigRowSchema);
export type ModuleConfigRow = z.infer<typeof ModuleConfigRowSchema>;
```

## Implementation Phases

**Phase 0: Base Boilerplate & Folder Setup**
- Scaffold Next.js App Router with TypeScript, Tailwind CSS, and Shadcn UI.
- Implement the exact directory structure detailed above.
- Setup `axios-client.ts` with auto-refresh token logic and central error toast routing.

**Phase 1: Security & Interactive Auth Gateway**
- Implement Login Screen (`/login`) integrating with backend `/auth/login`.
- Build the **Role Scope Modal** that renders upon authentication to resolve session permissions and update Zustand store state.
- Implement `PermissionGuard` component and Next.js middleware protection.

**Phase 2: RBAC Management Engine**
- Build `/rbac/roles` interface: Super Admin matrix to create custom Sub-Admin roles and toggle permission flags.
- Build `/rbac/users` interface: Assign roles to Sub-Admins via `POST /admin/users/:userId/assign-role`.

**Phase 3: Dynamic Module Config Matrix Builder**
- Build `/listings/config` dashboard displaying the 21 form modules against category and building/property type selections.
- Wire batch-upsert logic to `PUT /admin/module-config`.
- Build dynamic options management screen (`/listings/options`) to configure select dropdown options scoped by building type.

**Phase 4: Location & Property Name Moderation Engine**
- Build `/locations/pending` queue to approve or reject pending user submissions via `POST /admin/locations/:id/approve` and `reject`.
- Provide clear visual status indicators (*Admin Added, Pending Review, Approved, Rejected*).

**Phase 5: Redis Cache Triggers & Deployment**
- Connect admin config update actions to automated Redis cache invalidation channels.
- Dockerize the Next.js frontend using multi-stage builds for DigitalOcean Droplet deployment behind Cloudflare CDN/WAF. (To be done later after local check).
