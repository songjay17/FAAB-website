import { test, expect } from "./fixtures";

// The shared fixture reports an already-signed-in commissioner so the other
// specs can go straight to betting. These tests override /api/auth/session
// (and the claim/login routes) to drive the sign-in screen itself.

const MEMBERS = [
  { memberId: "975162996680945664", displayName: "jdawnso", claimed: true },
  { memberId: "984151623574323200", displayName: "ColeG99", claimed: false },
];

/** Replaces the fixture's signed-in stub with a signed-out one. */
async function signedOut(page: import("./fixtures").Page) {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ session: null, members: MEMBERS }),
    })
  );
}

test.describe("Sign-in: claim your team or enter your PIN", () => {
  test("signed-out visitors get the sign-in screen instead of the app", async ({ page }) => {
    await signedOut(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Who are you?" })).toBeVisible();
    // The book itself must not render behind the gate.
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  });

  test("an unclaimed member is prompted to choose a PIN, and claiming signs them in", async ({
    page,
  }) => {
    await signedOut(page);
    let claimBody: Record<string, unknown> | null = null;
    await page.route("**/api/auth/claim", async (route) => {
      claimBody = route.request().postDataJSON() as Record<string, unknown>;
      // After a successful claim the app refetches the session; flip the
      // stub to signed-in so the app renders.
      await page.route("**/api/auth/session", (r) =>
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            session: {
              leagueId: "1230632258184957952",
              memberId: "984151623574323200",
              isCommissioner: false,
            },
            members: MEMBERS,
          }),
        })
      );
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session: { memberId: "984151623574323200" } }),
      });
    });

    await page.goto("/");
    await page.getByLabel("Member").selectOption("984151623574323200");
    await expect(page.getByRole("button", { name: "Claim my team" })).toBeVisible();
    await page.getByLabel("Choose a PIN (4–12 digits)").fill("2468");
    await page.getByRole("button", { name: "Claim my team" }).click();

    // Signed in: the app shell renders (nav is present at every viewport).
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Who are you?" })).toHaveCount(0);
    expect(claimBody).toMatchObject({ memberId: "984151623574323200", pin: "2468" });
  });

  test("a claimed member signs in with their PIN, and a wrong PIN shows an error", async ({
    page,
  }) => {
    await signedOut(page);
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Incorrect member or PIN." }),
      })
    );

    await page.goto("/");
    await page.getByLabel("Member").selectOption("975162996680945664");
    // Already claimed, so this is a sign-in, not a claim.
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await page.getByLabel("PIN", { exact: true }).fill("9999");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Incorrect member or PIN.")).toBeVisible();
    // Still gated.
    await expect(page.getByRole("heading", { name: "Who are you?" })).toBeVisible();
  });
});

test.describe("Commissioner gating", () => {
  test("a non-commissioner sees a restricted notice instead of the tools", async ({ page }) => {
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            leagueId: "1230632258184957952",
            memberId: "984151623574323200",
            isCommissioner: false,
          },
          members: MEMBERS,
        }),
      })
    );

    await page.goto("/commissioner");
    await expect(page.getByText("These tools are commissioner-only")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset the league book" })).toHaveCount(0);
  });

  test("the commissioner sees the tools and the server-side audit trail", async ({ page }) => {
    await page.goto("/commissioner");
    await expect(page.getByRole("heading", { name: "Audit Activity" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset the league book" })).toBeVisible();
  });
});
