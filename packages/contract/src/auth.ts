export const AUTH_MODES = ['session', 'grant', 'reviewer', 'public'] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];
