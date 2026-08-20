import { test, expect } from "./fixtures";

// Fresh browser context per test = a fresh in-memory StubBook = seed data
// (see e2e/fixtures.ts), the same isolation the rest of the suite relies on.

// jdawnso — the signed-in commissioner, seeded with 12 available / 110 reserved.
const MEMBER = "jdawnso";

/** Opens the dialog and returns it — locators are scoped to it, since the page has other member selects. */
async function openDialog(page: import("./fixtures").Page) {
  await page.goto("/commissioner");
  await page.getByRole("button", { name: "Adjust FAAB" }).click();
  const dialog = page.getByRole("dialog", { name: "Adjust a member's FAAB" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("Commissioner: adjust a member's FAAB", () => {
  test("crediting a member raises their balance and logs the amount and reason", async ({
    page,
  }) => {
    const dialog = await openDialog(page);

    await dialog.getByLabel("Member").selectOption({ label: MEMBER });
    await dialog.getByLabel("Amount (negative to deduct)").fill("15");
    // The dialog previews the resulting balance before applying.
    await expect(dialog.getByText(/Available now: 12 FAAB → 27 FAAB/)).toBeVisible();

    await dialog.getByLabel("Reason").fill("waiver correction agreed in chat");
    await dialog.getByRole("button", { name: "Apply adjustment" }).click();

    await expect(page.getByText(/balance adjusted by \+15 FAAB/)).toBeVisible();

    // The adjusted member is the signed-in one, so their own wallet card on
    // the dashboard shows the new available balance.
    await page.goto("/");
    const available = page
      .locator("div", { hasText: /^Available to Bet$/ })
      .locator("xpath=following-sibling::p[1]")
      .first();
    await expect(available).toHaveText("27");
  });

  test("the audit trail records the adjustment with its signed amount", async ({ page }) => {
    const dialog = await openDialog(page);
    await dialog.getByLabel("Member").selectOption({ label: MEMBER });
    await dialog.getByLabel("Amount (negative to deduct)").fill("-5");
    await dialog.getByLabel("Reason").fill("double credit");
    await dialog.getByRole("button", { name: "Apply adjustment" }).click();

    await expect(
      page.getByText(/adjusted FAAB for .* — reason: -5 FAAB — double credit\./)
    ).toBeVisible();
  });

  test("a reason is required before the adjustment can be applied", async ({ page }) => {
    const dialog = await openDialog(page);
    await dialog.getByLabel("Member").selectOption({ label: MEMBER });
    await dialog.getByLabel("Amount (negative to deduct)").fill("10");

    // No reason yet: the button stays disabled rather than failing server-side.
    await expect(dialog.getByRole("button", { name: "Apply adjustment" })).toBeDisabled();
    await dialog.getByLabel("Reason").fill("correction");
    await expect(dialog.getByRole("button", { name: "Apply adjustment" })).toBeEnabled();
  });

  test("an adjustment that would go below zero is refused with the balance explained", async ({
    page,
  }) => {
    const dialog = await openDialog(page);
    await dialog.getByLabel("Member").selectOption({ label: MEMBER });
    await dialog.getByLabel("Amount (negative to deduct)").fill("-50");
    await dialog.getByLabel("Reason").fill("too much");
    await dialog.getByRole("button", { name: "Apply adjustment" }).click();

    await expect(dialog.getByText(/would take the balance below zero \(available: 12\)/)).toBeVisible();
  });
});
