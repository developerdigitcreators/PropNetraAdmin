export const APP_USERS_PARENT_MODULE = 'app_users';

export const APP_USER_TAB_ACCESS = [
  {
    name: 'Master Data',
    path: '/app-users/master-data',
    module: 'app_users_master',
    defaultSelected: false,
  },
  {
    name: 'OTP Issued',
    path: '/app-users/otp-issued',
    module: 'app_users_otp_issued',
    defaultSelected: true,
  },
  {
    name: 'OTP Verified',
    path: '/app-users/otp-verified',
    module: 'app_users_otp_verified',
    defaultSelected: false,
  },
] as const;

export type AppUsersTabModule = (typeof APP_USER_TAB_ACCESS)[number]['module'];

export const APP_USERS_ANY_READ = [
  `${APP_USERS_PARENT_MODULE}:read`,
  ...APP_USER_TAB_ACCESS.map((tab) => `${tab.module}:read`),
];

type HasPermission = (moduleName: string, action: string) => boolean;

export function canReadAppUsersTab(module: AppUsersTabModule, hasPermission: HasPermission) {
  if (hasPermission(module, 'read')) return true;
  // Parent-only grant: backend fills OTP Issued CRU; still open that default tab.
  return module === 'app_users_otp_issued' && hasPermission(APP_USERS_PARENT_MODULE, 'read');
}

export function defaultAppUsersPath(hasPermission: HasPermission) {
  const preferred = APP_USER_TAB_ACCESS.find((tab) => tab.defaultSelected);
  if (preferred && canReadAppUsersTab(preferred.module, hasPermission)) return preferred.path;
  const first = APP_USER_TAB_ACCESS.find((tab) => canReadAppUsersTab(tab.module, hasPermission));
  return first?.path || preferred?.path || '/app-users/otp-issued';
}

export function readPermissionsForTab(module: AppUsersTabModule): string[] {
  const keys = [`${module}:read`];
  if (module === 'app_users_otp_issued') keys.push(`${APP_USERS_PARENT_MODULE}:read`);
  return keys;
}

export function moduleForAppUsersTab(tab: 'master' | 'otp_issued' | 'otp_verified'): AppUsersTabModule {
  if (tab === 'otp_issued') return 'app_users_otp_issued';
  if (tab === 'otp_verified') return 'app_users_otp_verified';
  return 'app_users_master';
}
