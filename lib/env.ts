import { AUTH_API_URL } from "./auth/constants";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
export const isGeeoConfigured = Boolean(API_URL && AUTH_API_URL);
export { AUTH_API_URL, COOKIE_DOMAIN, GOOGLE_CLIENT_ID, COOKIE_AUTH } from "./auth/constants";
