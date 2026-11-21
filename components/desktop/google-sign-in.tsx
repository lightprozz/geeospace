import { useState } from "react";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { GOOGLE_CLIENT_ID } from "@/lib/auth/constants";
import { useAuthStore } from "@/stores/use-auth-store";
import { useSpace } from "./space-context";

function GoogleButton() {
  const { t } = useSpace();
  const login = useAuthStore(state => state.loginWithGoogle);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const google = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async response => {
      setPending(true);
      setError(!(await login(response.code)));
      setPending(false);
    },
    onError: () => { setPending(false); setError(true); },
    onNonOAuthError: () => { setPending(false); setError(true); },
  });
  return <><button className="os-button os-button-secondary" disabled={pending} onClick={() => { setError(false); setPending(true); google(); }}>{t("Đăng nhập với Google", "Sign in with Google")}</button>{error && <p role="alert">{t("Không thể đăng nhập Google. Vui lòng thử lại.", "Google sign-in failed. Please try again.")}</p>}</>;
}
export default function GoogleSignIn() {
  return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><GoogleButton /></GoogleOAuthProvider>;
}
