// Gruppi Cognito
export const COGNITO_GROUPS = {
  ADMIN: 'Admin',
} as const;

// Ruoli utente
export const USER_ROLES = {
  ADMIN: 'Admin',
  USER: 'User',
} as const;

// Determina il ruolo dai gruppi Cognito del JWT.
// Nessun gruppo (utente normale) → User. Gruppo Admin → Admin.
export function resolveRole(groups: string[]): string {
  return groups.includes(COGNITO_GROUPS.ADMIN) ? USER_ROLES.ADMIN : USER_ROLES.USER;
}

// Rotte applicative, relative al router (senza il base path di Vite,
// che viene aggiunto automaticamente da React Router tramite `basename`).
export const LOGIN_ROUTE = '/accesso/login';

// Unica area applicativa esistente: non c'è una sezione /user.
export const DEFAULT_ROUTE = '/admin';

// Route di default per ruolo
export const DEFAULT_ROUTE_BY_ROLE: Record<string, string> = {
  [USER_ROLES.ADMIN]: DEFAULT_ROUTE,
  [USER_ROLES.USER]: DEFAULT_ROUTE,
};

// URL assoluto del login, comprensivo del base path di Vite (`/silvia-webapp/`).
// Serve nei redirect fatti con `window.location`, che bypassano il router.
export function loginHref(): string {
  return `${import.meta.env.BASE_URL}${LOGIN_ROUTE.replace(/^\//, '')}`;
}

// Chiavi per localStorage
export const LOCAL_STORAGE_KEYS = {
  JWT_TOKEN: 'jwtToken',
  ID_TOKEN: 'idToken',
  ACCESS_TOKEN: 'accessToken',
  USER_ROLE: 'userRole',
  SIDEBAR_EXPANDED: 'sidebarExpanded',
  DEMO_MODE: 'demoMode',
  USER_EMAIL: 'userEmail',
  RETURN_URL: 'returnUrl'
} as const;
