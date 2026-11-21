import type { BrowserContext, Page } from "@playwright/test";

export const authBaseURL = "http://127.0.0.1:3101";
export const mockUser = { sub: "teacher-1", name: "Mai Nguyen", email: "mai@example.test", role: ["Teacher"], permission: ["classes.read"] };
export async function mockGeeo(page: Page) {
  await page.route("https://auth.geeo.test/connect/**", async route => {
    const request = route.request();
    const form = new URLSearchParams(request.postData() ?? "");
    const headers = { "access-control-allow-origin": "*" };
    if (request.url().endsWith("/token")) {
      if (form.get("password") === "wrong") {
        await route.fulfill({ status: 400, headers, json: { error: "invalid_grant" } });
      } else {
        await route.fulfill({ headers, json: { access_token: "mock-access", refresh_token: "mock-refresh", token_type: "Bearer", expires_in: 900 } });
      }
    } else {
      await route.fulfill({ headers, json: mockUser });
    }
  });
}
export async function seedGeeo(context: BrowserContext) {
  await context.addCookies([{
    name: "GEEO.AUTH",
    value: JSON.stringify({ access_token: "mock-access", refresh_token: "mock-refresh", token_type: "Bearer", expires_at: Math.floor(Date.now() / 1000) + 900 }),
    url: authBaseURL,
    sameSite: "Lax",
  }]);
}
