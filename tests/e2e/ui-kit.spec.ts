import { expect, test } from "@playwright/test";

const primitives = ["alert-dialog", "alert", "avatar", "badge", "breadcrumb", "button", "calendar", "card", "checkbox", "collapsible", "command", "dialog", "dropdown-menu", "field", "input-group", "input", "label", "popover", "progress", "scroll-area", "select", "separator", "sheet", "sidebar", "skeleton", "sonner", "sort-header", "spinner", "switch", "table", "tabs", "textarea", "tooltip"];

for (const theme of ["light", "dark"] as const) {
  test(`UI kit ${theme}: themed in development, unavailable in production`, async ({ page }, testInfo) => {
    const response = await page.goto(`/ui-kit?theme=${theme}&accent=blue`);
    if (testInfo.config.configFile.endsWith("playwright.worker.config.ts")) {
      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { name: "LMS UI kit" })).toHaveCount(0);
      return;
    }
    await expect(page.getByRole("heading", { name: "LMS UI kit" })).toBeVisible();
    for (const primitive of primitives) await expect(page.locator(`[data-primitive="${primitive}"]`)).toBeVisible();
    await expect(page.locator('[data-primitive="button"] button').first()).toHaveCSS("background-color", "rgb(73, 126, 206)");
    const chromeBackground = theme === "dark" ? "rgba(30, 23, 28, 0.8)" : "rgba(255, 253, 253, 0.78)";
    await expect(page.locator(".os-menubar")).toHaveCSS("background-color", chromeBackground);

    await page.getByRole("button", { name: "Open dialog", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Course dialog" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveClass(/lms-ui/);
    expect(await dialog.evaluate(element => element.parentElement?.classList.contains("geeospace-os"))).toBe(true);
    const background = await dialog.evaluate(element => getComputedStyle(element).backgroundColor);
    expect(background).toBe(theme === "dark" ? "oklch(0.269 0 0)" : "oklch(1 0 0)");
    const tokenColor = await dialog.evaluate(element => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = "var(--popover)";
      element.appendChild(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    });
    expect(background).toBe(tokenColor);
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Open popover", exact: true }).click();
    await expect(page.locator('[data-slot="popover-content"]')).toHaveCSS("background-color", background);
    await page.keyboard.press("Escape");
    await page.getByRole("combobox", { name: "Select course" }).click();
    await expect(page.getByRole("option", { name: "Mathematics" })).toBeVisible();
    await expect(page.locator('[data-slot="select-content"]')).toHaveCSS("background-color", background);
    await page.getByRole("option", { name: "Mathematics" }).click();
    await page.getByRole("button", { name: "Show toast" }).click();
    await expect(page.locator('[data-sonner-toaster]')).toHaveAttribute("data-sonner-theme", theme);
    await expect(page.getByText("Course saved", { exact: true })).toBeVisible();

    await page.addInitScript(mode => {
      localStorage.setItem("geeospace.desktop.appearance.v1", JSON.stringify({ mode, wallpaper: "geeo", glass: true, material: "glass" }));
    }, theme);
    await page.goto("/");
    await expect(page.locator(".geeospace-os")).toHaveAttribute("data-theme", theme);
    await expect(page.locator(".os-menubar")).toHaveCSS("background-color", chromeBackground);
    const barHeight = await page.evaluate(() => matchMedia("(pointer: fine)").matches && innerWidth >= 768 ? "36px" : innerWidth < 768 ? "48px" : "44px");
    await expect(page.locator(".os-menubar")).toHaveCSS("height", barHeight);
  });
}
