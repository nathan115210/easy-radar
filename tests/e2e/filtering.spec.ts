import { expect, test } from "@playwright/test";

/**
 * Scenario 2 (#32): category/state filtering updates the URL and the
 * visible cards, and a deep link restores the same view on a fresh load.
 * Uses `ai-engineering` and `software-architecture` (tests/e2e/fixtures/
 * fixture-data.ts) — neither category is touched by another spec, so
 * this test's assertions don't depend on run order.
 */
test("category and state filtering updates the URL and cards; a deep link restores the view", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("AI Engineering Item One")).toHaveCount(0);

  await page.getByRole("tab", { name: "AI Engineering & Developer Workflows" }).click();

  await expect(page).toHaveURL(/category=ai-engineering/);
  await expect(page.getByText("AI Engineering Item One")).toBeVisible();
  await expect(page.getByText("AI Engineering Item Two")).toBeVisible();
  await expect(page.getByText(/Web Core Item/)).toHaveCount(0);

  await page.getByText(/^Read \(/).click();

  await expect(page).toHaveURL(/state=read/);
  await expect(page.getByText("AI Engineering Item One")).toHaveCount(0);
  await expect(page.getByText("No items.")).toBeVisible();

  await page.goto("/?category=software-architecture&state=all&page=1");

  await expect(
    page.getByRole("tab", { name: "Software Design & System Architecture" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Software Architecture Item One")).toBeVisible();
});
