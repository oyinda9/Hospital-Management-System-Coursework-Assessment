import { test, expect } from "@playwright/test";

test("admin can log in and the Doctors page shows full doctor details", async ({ page }) => {
  await page.goto("http://localhost:5173/login");

  await page.getByPlaceholder("Email").fill("admin@e2e.test");
  await page.getByPlaceholder("Password", { exact: true }).fill("AdminPass123");
  await page.getByPlaceholder("Confirm Password").fill("AdminPass123");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL("http://localhost:5173/");

  await page.goto("http://localhost:5173/doctors");

  await expect(page.getByRole("heading", { name: "Doctors" })).toBeVisible();
  await expect(page.getByText("Gregory Lane")).toBeVisible();
  await expect(page.getByText("doctor@e2e.test")).toBeVisible();
});