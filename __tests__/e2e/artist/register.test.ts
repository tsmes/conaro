import { test, expect } from "@playwright/test";
import { cleanDatabase, uniqueEmail } from "../helpers";

test.describe("artist register", () => {
  test.beforeEach(async () => {
    await cleanDatabase();
  });

  test("creates account and lands on the artist dashboard", async ({
    page,
  }) => {
    const email = uniqueEmail("artist");
    const password = "password123";

    await page.goto("/register/artist");

    await page.getByLabel(/display name/i).fill("Test Artist");
    await page.getByLabel(/email address/i).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);

    await page
      .getByRole("button", { name: /create artist account/i })
      .click();

    await page.waitForURL("/dashboard");
    await expect(
      page.getByRole("heading", { name: /my applications/i })
    ).toBeVisible();
  });
});
