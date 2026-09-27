export interface Impersonator {
  id: number;
  username: string;
}

/** The account the session acts as; `impersonated_by` is the admin behind it while they assume this user. */
export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  impersonated_by: Impersonator | null;
}
