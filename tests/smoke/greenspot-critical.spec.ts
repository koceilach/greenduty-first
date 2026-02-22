import { expect, test } from "@playwright/test";

test("greenspot landing renders core sections", async ({ page }) => {
  await page.goto("/greenspot");
  await expect(page.getByRole("heading", { name: /GreenSpot Reporter/i })).toBeVisible();
  await expect(page.getByText(/Live reported-green feed/i)).toBeVisible();
});

test("reported-green guest view shows auth prompt", async ({ page }) => {
  await page.goto("/greenspot/reported-green");
  await expect(
    page.getByText(/Sign in to report incidents and track your personal GreenSpot activity/i)
  ).toBeVisible();
});

test("report page save draft button is non-submit", async ({ page }) => {
  await page.goto("/greenspot/report");
  const saveDraft = page.getByRole("button", { name: /Save draft/i });
  await expect(saveDraft).toBeVisible();
  await expect(saveDraft).toHaveAttribute("type", "button");
});

test("privacy-safe public feed endpoint responds with redacted shape", async ({
  request,
}) => {
  const response = await request.get("/api/greenspot/reports?public=1&safe=1");
  expect([200, 429]).toContain(response.status());
  if (response.status() === 429) return;

  const payload = (await response.json()) as {
    reports?: Array<{
      user_name?: string;
      notes?: string;
    }>;
  };
  expect(Array.isArray(payload.reports)).toBeTruthy();

  const first = payload.reports?.[0];
  if (first) {
    expect(first.user_name).toBe("Community Member");
    expect((first.notes ?? "").toLowerCase()).toContain("privacy-safe");
  }
});
