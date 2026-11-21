import { lazy, Suspense, useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/stores/use-auth-store";
import { GOOGLE_CLIENT_ID } from "@/lib/auth/constants";
import { useSpace } from "./space-context";

const GoogleSignIn = lazy(() => import("./google-sign-in"));

export function AccountPanel() {
  const { t } = useSpace();
  const { user, isLoading, isAuthenticated, login, logout } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);
    setError(false);
    const success = await login(String(data.get("email")).trim(), String(data.get("password")));
    form.reset();
    setSubmitting(false);
    setError(!success);
  }
  return <div className="os-panel os-account-panel"><span className="os-panel-symbol"><ShieldCheck size={30} /></span><p className="os-eyebrow">GEE-O AUTH</p>
    {isLoading ? <p role="status">{t("Đang tải phiên đăng nhập…", "Loading your session…")}</p> : isAuthenticated && user ? <>
      <h1>{user.name || user.email || t("Tài khoản Gee-O", "Gee-O account")}</h1><p>{user.email}</p>
      <p>{t("Vai trò", "Roles")}: {user.roles.join(", ") || t("Chưa có vai trò", "No roles")}</p>
      <button className="os-button os-button-secondary" onClick={logout}>{t("Đăng xuất", "Sign out")}</button>
    </> : <>
      <h1>{t("Đăng nhập Gee-O", "Sign in to Gee-O")}</h1>
      <form className="os-auth-form" onSubmit={submit} aria-busy={submitting}>
        <label>Email<input name="email" type="email" autoComplete="username" required disabled={submitting} /></label>
        <label>{t("Mật khẩu", "Password")}<input name="password" type="password" autoComplete="current-password" required disabled={submitting} /></label>
        {error && <p role="alert">{t("Đăng nhập thất bại. Vui lòng kiểm tra thông tin và thử lại.", "Sign-in failed. Please check your details and try again.")}</p>}
        <button className="os-button" type="submit" disabled={submitting}>{submitting ? t("Đang đăng nhập…", "Signing in…") : t("Đăng nhập", "Sign in")}</button>
      </form>
      {GOOGLE_CLIENT_ID && <Suspense fallback={null}><GoogleSignIn /></Suspense>}
    </>}
  </div>;
}
