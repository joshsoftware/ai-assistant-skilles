/**
 * Login feature — request/response interfaces.
 *
 * Convention (mirrors stp-portal):
 *   - Interfaces prefixed `I`.
 *   - One file per feature; co-located with services/hooks/utils.
 *   - Response envelope: { statusCode, status, message, data }.
 *
 * Form value types are inferred from the Zod schema (see `./utils.ts`) so
 * the source of truth for form shape stays in the schema. Service-level
 * request/response shapes live here.
 */

export interface ILoginRequest {
  username: string;
  password: string;
}

export interface ILoginResponseData {
  token: string;
  refreshToken?: string;
  userAttributes: {
    userId: string;
    name: string;
    email: string;
    roles: string[];
  };
}

export interface ILoginResponse {
  statusCode: number;
  status: 'success' | 'failure';
  message: string;
  data: ILoginResponseData;
}
