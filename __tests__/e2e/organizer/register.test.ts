import { test, expect } from "@playwright/test";
import { cleanDatabase, uniqueEmail } from "../helpers";

test.describe("organizer register", () => {
  test.beforeEach(async () => {
    await cleanDatabase();
  });

  test("creates account and lands on the organizer dashboard", async ({
    page,
  }) => {
    const email = uniqueEmail("organizer");
    const password = "password123";

    await page.goto("/register/organizer");

    await page.getByLabel(/your name/i).fill("Test Organizer");
    await page.getByLabel(/convention name/i).fill("Test Convention");
    await page.getByLabel(/email address/i).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);

    await page
      .getByRole("button", { name: /create organizer account/i })
      .click();

    await page.waitForURL("/conventions/manage");
    await expect(
      page.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Create event" })
    ).toBeVisible();
  });
});
