import { expect, test } from "@playwright/test";
const ready = async (page: import("@playwright/test").Page) => { await expect(page.locator(".geeospace-os")).toHaveAttribute("data-ready", "true"); };
async function utilities(page: import("@playwright/test").Page) { const toggle = page.getByRole("button", { name: "Tiện ích", exact: true }); if (await toggle.isVisible()) await toggle.click(); }
test("chrome preserves work on arrange and dock toggle; magnification has no overlaps", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop window and dock geometry");
  await page.goto("/requests"); await ready(page);
  const dock = page.getByRole("navigation", { name: "Dock ứng dụng" });
  await dock.getByRole("button", { name: "Công & lương", exact: true }).click();
  const win = page.locator('[data-app="work"]'); await expect(win).toHaveAttribute("data-phase", "visible");
  await dock.getByRole("button", { name: "Công & lương", exact: true }).click(); await expect(win).toBeHidden();
  const opened = await page.locator('.os-window').evaluateAll(els => els.map(el => [el.getAttribute("data-app"), (el as HTMLElement).hidden]));
  await page.getByRole("button", { name: "Menu Geeospace" }).click(); await page.getByRole("menuitem", { name: "Sắp lại cửa sổ" }).click();
  expect(await page.locator('.os-window').evaluateAll(els => els.map(el => [el.getAttribute("data-app"), (el as HTMLElement).hidden]))).toEqual(opened);
  await dock.getByRole("button", { name: "Công & lương", exact: true }).click(); await expect(win).toHaveAttribute("data-phase", "visible");
  await page.keyboard.press("Alt+ArrowRight"); await expect(win).toHaveAttribute("data-mode", "right"); await page.keyboard.press("Alt+ArrowRight"); await expect(win).toHaveAttribute("data-mode", "normal");
  const dockHeight = (await dock.boundingBox())!.height;
  for (const name of ["Hôm nay", "Công & lương", "Tất cả ứng dụng"]) {
    await dock.getByRole("button", { name, exact: true }).hover();
    expect((await dock.boundingBox())!.height).toBe(dockHeight);
    await expect.poll(() => dock.locator(".os-glyph").evaluateAll(els => els.slice(1).every((el, i) => els[i].getBoundingClientRect().right <= el.getBoundingClientRect().left))).toBe(true);
  }
  const brand = page.getByRole("button", { name: "Menu Geeospace" }); await brand.click(); await page.keyboard.press("Tab"); await expect(page.getByRole("menu")).toBeHidden(); await expect(brand).not.toBeFocused();
  await dock.getByRole("button", { name: "Xem tất cả cửa sổ" }).click(); await page.setViewportSize({ width: 375, height: 812 }); await expect(page.locator(".geeospace-os")).toHaveAttribute("data-overview", "false");
});
test("utilities are opt-in and language changes preserve app identity and UI preferences", async ({ page }) => {
  const requests: string[] = []; page.on("request", req => { if (req.url().includes("/api/weather")) requests.push(req.url()); });
  await page.goto("/requests"); await ready(page); expect(requests).toEqual([]);
  await utilities(page); await page.getByRole("button", { name: "Thời tiết", exact: true }).click(); expect(requests).toEqual([]);
  await expect(page.getByText("Thời tiết đang tắt. Chọn thành phố để bật.")).toBeVisible();
  await page.getByRole("button", { name: "Đóng thời tiết", exact: true }).click();
  await page.getByRole("button", { name: "Đổi ngôn ngữ sang tiếng Anh" }).click();
  await expect(page.locator('[data-app="requests"]')).toHaveAttribute("aria-label", "My requests"); await expect(page).toHaveURL(/requests/);
  await expect(page.locator('[data-app="requests"]').getByRole("heading", { name: "My requests" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("geeospace.desktop.appearance.v1") ?? "{}").locale)).toBe("en");
  await page.reload(); await ready(page); await expect(page.locator(".geeospace-os")).toHaveAttribute("lang", "en");
  expect(requests).toEqual([]);
});
test("appearance supports device image, dropped files, reset and scoped motion reduction", async ({ page }) => {
  await page.goto("/#appearance"); await ready(page); const win = page.locator('[data-app="appearance"]'); await expect(win).toHaveAttribute("data-phase", "visible");
  const chrome = page.locator(".os-menubar");
  const glassSupported = await page.evaluate(() => CSS.supports("backdrop-filter", "blur(1px)") && !matchMedia("(prefers-reduced-transparency: reduce)").matches && !matchMedia("(prefers-contrast: more)").matches);
  if (glassSupported) await expect.poll(() => chrome.evaluate(el => getComputedStyle(el).backdropFilter)).not.toBe("none");
  await win.getByLabel("Chất liệu điều khiển").selectOption("opaque"); await expect(page.locator(".geeospace-os")).toHaveAttribute("data-material", "opaque");
  await expect.poll(() => chrome.evaluate(el => getComputedStyle(el).backdropFilter)).toBe("none");
  await win.getByRole("switch", { name: "Chuyển động giao diện", exact: true }).click(); await expect(page.locator(".geeospace-os")).toHaveAttribute("data-motion", "reduce");
  const file = { name: "local.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN7kAAAAASUVORK5CYII=", "base64") };
  await win.locator('input[type="file"]').first().setInputFiles(file); await expect(page.locator(".geeospace-os")).toHaveAttribute("data-wallpaper", "image");
  await page.reload(); await ready(page); await expect(page.locator(".geeospace-os")).toHaveAttribute("data-wallpaper", "image");
  await win.getByRole("button", { name: "Khôi phục giao diện mặc định" }).click(); await expect(page.locator(".geeospace-os")).toHaveAttribute("data-wallpaper", "geeo"); await expect(win).toBeVisible();
  {
    const companion = page.getByRole("button", { name: /Bạn đồng hành GeeO, mở hướng dẫn/ }); await companion.click(); await expect(page.getByText("Bạn cần đi đâu?", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Đóng hướng dẫn" }).click(); const before = (await companion.boundingBox())!; await companion.focus(); await page.keyboard.press("Shift+ArrowLeft"); expect((await companion.boundingBox())!.x).toBeLessThan(before.x - 30);
    await page.getByRole("button", { name: "Tạm dừng companion", exact: true }).click(); await expect(page.locator(".os-companion")).toHaveAttribute("data-paused", "true"); await page.getByRole("button", { name: "Ẩn companion", exact: true }).click(); await expect(companion).toBeHidden();
  }
});

test("local video pauses with reduced motion and releases its object URL on reset", async ({ page }) => {
  await page.addInitScript(() => {
    const live = new Set<string>(), create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    Object.assign(window, { liveWallpaperUrls: live });
    URL.createObjectURL = blob => { const url = create(blob); live.add(url); return url; };
    URL.revokeObjectURL = url => { live.delete(url); revoke(url); };
  });
  await page.goto("/#appearance"); await ready(page);
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#d51e37"; ctx.fillRect(0, 0, 64, 64);
    const stream = canvas.captureStream(10), recorder = new MediaRecorder(stream, { mimeType: "video/webm" }), chunks: Blob[] = [];
    const done = new Promise<Blob>(resolve => { recorder.ondataavailable = event => chunks.push(event.data); recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" })); });
    recorder.start(); await new Promise(resolve => setTimeout(resolve, 250)); recorder.stop(); const blob = await done; stream.getTracks().forEach(track => track.stop()); return [...new Uint8Array(await blob.arrayBuffer())];
  });
  const win = page.locator('[data-app="appearance"]');
  await win.locator('input[type="file"]').nth(1).setInputFiles({ name: "own-test-video.webm", mimeType: "video/webm", buffer: Buffer.from(bytes) });
  await expect(page.locator(".geeospace-os")).toHaveAttribute("data-wallpaper", "video"); await expect(page.locator(".os-wallpaper video")).toHaveAttribute("src", /^blob:/);
  await page.emulateMedia({ reducedMotion: "reduce" }); await expect.poll(() => page.locator(".os-wallpaper video").evaluate(video => (video as HTMLVideoElement).paused)).toBe(true);
  await page.reload(); await ready(page); await expect(page.locator(".os-wallpaper video")).toHaveAttribute("src", /^blob:/);
  await win.getByRole("button", { name: "Khôi phục giao diện mặc định" }).click();
  await expect(page.locator(".os-wallpaper video")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as typeof window & { liveWallpaperUrls: Set<string> }).liveWallpaperUrls.size)).toBe(0);
});

test("desktop file drop opens appearance and rejects a malformed image", async ({ page }) => {
  await page.goto("/requests"); await ready(page);
  await page.evaluate(() => {
    const file = new File([new Uint8Array([137,80,78,71])], "invalid-signature.png", { type: "image/png" });
    const transfer = new DataTransfer(); transfer.items.add(file);
    document.querySelector(".os-wallpaper")!.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });
  // A malformed image must be reported rather than persisted as usable wallpaper.
  await expect(page.locator('[data-app="appearance"]')).toBeVisible();
  await expect(page.locator('[data-app="appearance"]').getByRole("alert")).toContainText("Không đọc được ảnh");
  await expect(page.locator(".geeospace-os")).toHaveAttribute("data-wallpaper", "geeo");
});

test("storage quota errors keep current preferences usable and report the failure", async ({ page }) => {
  await page.addInitScript(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key === "geeospace.desktop.appearance.v1") throw new DOMException("Device quota", "QuotaExceededError"); return set.call(this, key, value); }; });
  await page.goto("/#appearance"); await ready(page);
  await page.locator('[data-app="appearance"]').getByRole("button", { name: "Sáng", exact: true }).click();
  await expect(page.locator(".geeospace-os")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".os-storage-warning")).toContainText("Không lưu được sở thích");
  await expect(page.locator('[data-app="appearance"]')).toBeVisible();
});

test("weather API rejects invalid coordinates and arbitrary proxy requests", async ({ request }) => {
  const coordinates = await request.get("/api/weather?mode=forecast&lat=91&lon=0"); expect(coordinates.status()).toBe(400); expect(await coordinates.json()).toEqual({ error: "invalid" });
  const passthrough = await request.get("/api/weather?url=https://example.com"); expect(passthrough.status()).toBe(400); expect(await passthrough.json()).toEqual({ error: "invalid" });
});
