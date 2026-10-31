import { expect, test } from "@playwright/test";

test("OS motion: interruption, gestures, keyboard and anchored lifecycle", async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/requests");
  await expect(page.locator(".geeospace-os")).toHaveAttribute("data-ready", "true");
  const win = page.locator('[data-app="requests"]');
  await expect(win).toHaveAttribute("data-phase", "visible");
  if (isMobile) {
    const title = win.locator(".os-window-title");
    const box = (await title.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 22);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + 82, { steps: 5 });
    const pulled = (await win.boundingBox())!.y;
    await page.mouse.up();
    expect(pulled).toBeGreaterThan(90);
    await expect.poll(async () => (await win.boundingBox())!.y).toBeLessThan(60);
    await expect(win).toBeVisible();
    const homeStyle = await page.locator(".os-mobile-home").evaluate(el => ({ transform: getComputedStyle(el).transform, opacity: Number(getComputedStyle(el).opacity) }));
    expect(homeStyle.transform).not.toBe("none");
    expect(homeStyle.opacity).toBeLessThan(1);
    await win.getByRole("button", { name: "Về màn hình chính" }).click();
    await expect(win).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Ứng dụng trên điện thoại" })).toBeVisible();
    await page.goBack();
    await expect(win).toBeHidden();
  } else {
    const maximize = win.getByRole("button", { name: "Phóng to hoặc khôi phục Yêu cầu của tôi" });
    await maximize.click();
    await expect(win).toHaveAttribute("data-mode", "maximized");
    await expect(win).toHaveAttribute("data-phase", "visible");
    await win.locator(".os-window-name").click();
    await expect(win).toHaveAttribute("data-mode", "maximized");
    await win.locator(".os-window-name").dblclick();
    await expect(win).toHaveAttribute("data-mode", "normal");
    await expect(win).toHaveAttribute("data-phase", "visible");
    const before = (await win.boundingBox())!;
    await win.locator(".os-window-title").focus();
    await page.keyboard.press("Shift+ArrowRight");
    await expect(win).toHaveAttribute("data-phase", "visible");
    expect((await win.boundingBox())!.x).toBeGreaterThan(before.x + 30);
    // Inspect within one frame: exiting windows stay rendered while input is disabled.
    const minimizing = await win.evaluate(async el => {
      (el.querySelector('.os-light-min') as HTMLButtonElement).click();
      await new Promise(requestAnimationFrame);
      return { hidden: (el as HTMLElement).hidden, inert: (el as HTMLElement).inert, animations: el.getAnimations().length, duration: Number(el.getAnimations()[0]?.effect?.getTiming().duration) };
    });
    expect(minimizing).toMatchObject({ hidden: false, inert: true, animations: 1 });
    expect(minimizing.duration).toBeGreaterThan(150);
    await page.getByRole("navigation", { name: "Dock ứng dụng" }).getByRole("button", { name: "Yêu cầu của tôi", exact: true }).evaluate(el => (el as HTMLButtonElement).click());
    await expect(win).toHaveAttribute("data-phase", "visible");
    await expect(win).not.toHaveAttribute("inert");
    await expect(page).toHaveURL(/#requests$/);
    const brand = page.getByRole("button", { name: "Menu Geeospace" });
    await brand.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: "Tất cả ứng dụng" })).toBeFocused();
    await page.keyboard.press("End");
    await expect(page.getByRole("menuitem", { name: "Sắp lại cửa sổ" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(brand).toBeFocused();
    await expect(page.getByRole("menu")).toBeHidden();
    await page.keyboard.press("Control+k");
    const input = page.getByRole("combobox", { name: "Tìm ứng dụng" });
    await input.fill("doi chieu");
    await expect(page.getByRole("option", { name: /Công & lương/ })).toBeVisible();
    await input.fill("cong luong");
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-app="work"]')).toHaveAttribute("data-phase", "visible");
  }
  expect(errors).toEqual([]);
});

test("OS motion: reduced motion settles immediately, including closing", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/requests");
  await expect(page.locator(".geeospace-os")).toHaveAttribute("data-ready", "true");
  const win = page.locator('[data-app="requests"]');
  await expect(win).toHaveAttribute("data-phase", "visible");
  expect(await win.evaluate(el => el.getAnimations().filter(animation => animation.playState === "running").length)).toBe(0);
  await win.getByRole("button", { name: isMobile ? "Về màn hình chính" : "Đóng Yêu cầu của tôi", exact: true }).click();
  await expect(win).toHaveAttribute("data-phase", "closed");
  await expect(win).toBeHidden();
});

test("OS recovery: no JavaScript explains recovery instead of indefinite loading", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/`);
    await expect(page.getByRole("heading", { name: "Geeospace cần JavaScript" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tải lại Geeospace" })).toBeVisible();
    await expect(page.getByText("Đang mở không gian làm việc…")).toBeHidden();
  } finally { await context.close(); }
});

test("mobile gesture takes over the current visual sheet frame during entry", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile sheet handoff");
  await page.goto("/"); await expect(page.locator(".geeospace-os")).toHaveAttribute("data-ready", "true");
  await page.getByRole("navigation", { name: "Ứng dụng trên điện thoại" }).getByRole("button", { name: "Yêu cầu của tôi", exact: true }).evaluate(async el => {
    (el as HTMLButtonElement).click(); await new Promise(requestAnimationFrame);
    let animation: Animation | undefined;
    for (let frame = 0; frame < 10 && !animation; frame++) { animation = document.querySelector('[data-app="requests"]')?.getAnimations()[0]; if (!animation) await new Promise(requestAnimationFrame); }
    if (!animation) throw new Error("The sheet must animate before testing gesture handoff");
    animation.pause(); animation.currentTime = Number(animation.effect!.getTiming().duration) * .2;
  });
  const win = page.locator('[data-app="requests"]'), title = win.locator(".os-window-title"), box = (await title.boundingBox())!, before = (await win.boundingBox())!.y;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 24, { steps: 4 });
  const after = (await win.boundingBox())!.y; expect(after - before).toBeGreaterThan(18); expect(after - before).toBeLessThan(30);
  await page.mouse.up(); await expect.poll(async () => (await win.boundingBox())!.y).toBeLessThan(60);
});

test("desktop drag preserves a small visual frame instead of jumping to minimum size", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop frame handoff");
  await page.goto("/requests"); await expect(page.locator(".geeospace-os")).toHaveAttribute("data-ready", "true");
  await page.locator('.os-dock [data-launch-app="account"]').evaluate(async el => {
    (el as HTMLButtonElement).click();
    let animation: Animation | undefined;
    for (let frame = 0; frame < 10 && !animation; frame++) { await new Promise(requestAnimationFrame); animation = document.querySelector('[data-app="account"]')?.getAnimations()[0]; }
    if (!animation) throw new Error("The window must animate before testing gesture handoff");
    animation.pause(); animation.currentTime = Number(animation.effect!.getTiming().duration) * .05;
  });
  const win = page.locator('[data-app="account"]'), title = win.locator(".os-window-title"), box = (await title.boundingBox())!, before = (await win.boundingBox())!;
  expect(before.width).toBeLessThan(320);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 24, box.y + box.height / 2 + 24, { steps: 4 });
  const after = (await win.boundingBox())!; expect(Math.abs(after.width - before.width)).toBeLessThan(2); expect(Math.abs(after.height - before.height)).toBeLessThan(2);
  await page.mouse.up(); await expect(win).toHaveAttribute("data-phase", "visible"); expect((await win.boundingBox())!.width).toBeGreaterThanOrEqual(320);
});

test("unfocused activations preserve launch origin and palette return focus", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop source geometry");
  await page.goto("/assistant"); await expect(page.locator(".geeospace-os")).toHaveAttribute("data-ready", "true");
  const assistant = page.locator('[data-app="assistant"]'); await expect(assistant).toHaveAttribute("data-phase", "visible");
  const source = assistant.getByRole("button", { name: "Lịch làm việc", exact: true }), box = (await source.boundingBox())!;
  await source.evaluate(async el => {
    (el as HTMLButtonElement).click();
    let animation: Animation | undefined;
    for (let frame = 0; frame < 10 && !animation; frame++) { await new Promise(requestAnimationFrame); animation = document.querySelector('[data-app="calendar"]')?.getAnimations()[0]; }
    if (!animation) throw new Error("Expected launch animation"); animation.pause(); animation.currentTime = 0;
  });
  const calendar = page.locator('[data-app="calendar"]'), start = (await calendar.boundingBox())!;
  expect(Math.abs(start.x - box.x)).toBeLessThan(2); expect(Math.abs(start.y - box.y)).toBeLessThan(2); expect(Math.abs(start.width - box.width)).toBeLessThan(2);
  await calendar.evaluate(el => el.getAnimations().forEach(animation => animation.finish()));
  await calendar.focus();
  const search = page.getByRole("banner").getByRole("button", { name: "Tìm nhanh", exact: true });
  await search.evaluate(el => (el as HTMLButtonElement).click()); await expect(page.getByRole("combobox")).toBeVisible(); await page.keyboard.press("Escape"); await expect(search).toBeFocused();
});
