import { test, expect } from "@playwright/test";

test("patient can choose a department and then select the doctor", async ({ page }) => {
  await page.goto("http://localhost:5174/appointment");

  const dropdowns = page.locator("select");
  const department = dropdowns.nth(1);
  const doctor = dropdowns.nth(2);

  await department.selectOption("Cardiology");
  await doctor.selectOption({ label: "Gregory Lane" });

  await expect(doctor.locator("option:checked")).toHaveText("Gregory Lane");
});