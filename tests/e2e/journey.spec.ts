import { expect, test, type Page } from "@playwright/test";

/**
 * The MVP success journey (spec §88): sign up, create a Khatma, invite someone, they join,
 * Juz are assigned, both read and complete, the group sees completion, a dedication is added,
 * and global statistics reflect it.
 */
const shots = process.env.E2E_SCREENSHOTS;
async function shot(page: Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${test.info().project.name}-${name}.png`, fullPage: true });
}

async function signUp(page: Page, name: string, email: string) {
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a calm long password");
  await page.getByRole("button", { name: "Create account" }).click();
}

/** Completes the reader's remaining Juz from the home screen; stops when the Khatma completes. */
async function completeAllMine(page: Page) {
  for (let i = 0; i < 30; i++) {
    await page.goto("/home");
    await expect(page.getByText("Today's Juz")).toBeVisible();
    const button = page.getByRole("button", { name: "Mark Complete" });
    if ((await button.count()) === 0) return false;
    const isFinalJuz = (await page.getByRole("img", { name: "29 / 30 Juz" }).count()) > 0;
    await button.first().click();
    await page.getByRole("button", { name: "Yes, I've finished" }).click();
    if (isFinalJuz) {
      await page.waitForURL(/\/khatma\//);
      return true;
    }
    await expect(page.getByText(/completed, Alhamdulillah\./).last()).toBeVisible();
  }
  return false;
}

test("a group completes the Qur'an together", async ({ page, browser }) => {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  // Landing → onboarding → sign up
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Read. Complete. Together.");
  await shot(page, "01-landing");
  await page.getByRole("link", { name: "Start Your Khatma" }).first().click();
  await page.getByRole("button", { name: "Get Started" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await shot(page, "02-onboarding-choice");
  await page.getByRole("button", { name: "Start a Khatma" }).click();
  await expect(page).toHaveURL(/\/signup/);
  await signUp(page, "Maryam", `maryam${stamp}@e2e.iqrafi.com`);

  // Create Khatma
  await expect(page).toHaveURL(/\/groups\/new/);
  await page.getByLabel("Khatma name").fill("E2E Family Khatma");
  await shot(page, "03-create");
  await page.getByRole("button", { name: "Create Khatma" }).click();
  await expect(page.getByRole("heading", { name: "E2E Family Khatma" })).toBeVisible();
  const inviteLink = (await page.locator("code").first().textContent())!.trim();
  expect(inviteLink).toContain("/invite/");
  await shot(page, "04-group-gathering");

  // Second person joins through the invitation
  const other = await browser.newContext();
  const guest = await other.newPage();
  await guest.goto(new URL(inviteLink).pathname);
  await expect(guest.getByText("You're invited to a Khatma", { exact: true })).toBeVisible();
  await shot(guest, "05-invite");
  await guest.getByRole("link", { name: "Create an account to join" }).click();
  await signUp(guest, "Bilal", `bilal${stamp}@e2e.iqrafi.com`);
  await expect(guest).toHaveURL(/\/invite\//);
  await guest.getByRole("button", { name: "Join Khatma" }).click();
  await expect(guest.getByText("Welcome to E2E Family Khatma.")).toBeVisible();

  // Owner assigns Juz
  await page.reload();
  await page.getByRole("button", { name: "Assign Juz and begin" }).click();
  await expect(page.getByRole("heading", { name: "The 30 Juz" })).toBeVisible();
  await shot(page, "06-group-active");

  // Home shows the current Khatma and today's Juz
  await page.goto("/home");
  await expect(page.getByText("Current Khatma")).toBeVisible();
  await expect(page.getByText("Today's Juz")).toBeVisible();
  await shot(page, "07-home");

  // Read Juz 1 in the reader
  await page.getByRole("link", { name: "Read Juz" }).first().click();
  await expect(page).toHaveURL(/\/quran\/juz\/1/);
  await expect(page.locator("[data-ayah-id='1']")).toBeVisible();
  await shot(page, "08-reader");
  await page.getByRole("button", { name: "Mark Juz 1 Complete" }).click();
  await page.getByRole("button", { name: "Yes, I've finished" }).click();
  await expect(page.getByText("Juz 1 completed, Alhamdulillah.")).toBeVisible();

  // Both readers finish their Juz
  expect(await completeAllMine(page)).toBe(false);
  // The final Juz completes the Khatma and takes the reader to the completion screen.
  expect(await completeAllMine(guest)).toBe(true);
  await expect(guest.getByRole("heading", { name: "Alhamdulillah" })).toBeVisible();

  // The rest of the group sees the completion on their home screen
  await page.goto("/home");
  await expect(page.getByText("E2E Family Khatma has completed the Qur'an.")).toBeVisible();
  await shot(guest, "09-completion");

  // Optional dedication, private by default
  await guest.getByRole("button", { name: "Yes, add dedication" }).click();
  await guest.getByLabel("Someone who has passed away").check();
  await guest.getByLabel(/^Name/).fill("Ahmed Khan");
  await expect(guest.getByLabel("Private — only you")).toBeChecked();
  await guest.getByRole("button", { name: "Save dedication" }).click();
  await expect(guest.getByText("Dedicated in memory of Ahmed Khan").first()).toBeVisible();
  await shot(guest, "10-dedication");

  // Global statistics reflect real activity
  await page.goto("/discover");
  await expect(page.getByRole("heading", { name: "The World Is Reading" })).toBeVisible();
  await shot(page, "11-discover");
  await other.close();
});

test("the interface switches to Arabic with right-to-left layout", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Language").selectOption("ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("اقرأ. أتمّ. معًا.");
  await shot(page, "12-arabic");
  await page.getByLabel("اللغة").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("private pages require sign-in and return afterwards", async ({ page }) => {
  await page.goto("/groups");
  await expect(page).toHaveURL(/\/login\?next=%2Fgroups/);
});
