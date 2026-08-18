import { expect, test } from "@playwright/test";

/**
 * Scenario 1 (#32): the main page loads with the status alert, category
 * tabs, state filter, cards, and pagination present in PRD §6.1's order.
 * Uses `web-core` (51 fixture items, tests/e2e/fixtures/fixture-data.ts)
 * so pagination actually renders — `web-core` isn't touched by any other
 * spec, so this test doesn't need to coordinate with them.
 */
test("app loads with the status alert, tabs, filter, cards, and pagination in order", async ({
  page,
}) => {
  await page.goto("/");

  const alert = page.getByRole("alert");
  const tabs = page.getByRole("tablist");
  const stateFilter = page.getByText(/^All \(/);
  const firstCard = page.getByText(/Web Core Item/).first();
  const pagination = page.getByRole("button", { name: "2", exact: true });

  await expect(alert).toBeVisible();
  await expect(tabs).toBeVisible();
  await expect(stateFilter).toBeVisible();
  await expect(firstCard).toBeVisible();
  await expect(pagination).toBeVisible();

  const [alertHandle, tabsHandle, filterHandle, cardHandle, paginationHandle] = await Promise.all(
    [alert, tabs, stateFilter, firstCard, pagination].map((locator) => locator.elementHandle()),
  );

  const positions = await page.evaluate(
    (elements) => elements.map((el) => el!.getBoundingClientRect().top),
    [alertHandle, tabsHandle, filterHandle, cardHandle, paginationHandle],
  );

  expect(positions).toEqual([...positions].sort((a, b) => a - b));
});
