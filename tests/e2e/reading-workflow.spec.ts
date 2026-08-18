import { expect, test } from "@playwright/test";

/**
 * Scenarios 3-6 (#32), as one continuous session — a real user hits these
 * in sequence, and each step's fixture state depends on the one before
 * it, so splitting them into independent tests would just mean
 * re-deriving the same setup with brittle cross-test assumptions. Uses
 * `devops-cloud`'s two dedicated fixture items (tests/e2e/fixtures/
 * fixture-data.ts), untouched by the other specs.
 */
test("marking read persists across reload, ignoring requires confirmation, beforeunload guards unsaved state, and Finish reading reports inline", async ({
  page,
}) => {
  await page.goto("/?category=devops-cloud");

  const readCard = page.locator("a").filter({ hasText: "DevOps Item To Mark Read" });
  const ignoreCard = page.locator("a").filter({ hasText: "DevOps Item To Ignore" });

  // Scenario 3: marking read persists across a reload.
  await readCard.getByRole("button", { name: "Mark as read" }).click();
  await expect(readCard.getByRole("button", { name: "Mark as unread" })).toBeVisible();

  await page.reload();
  await expect(
    page.locator("a").filter({ hasText: "DevOps Item To Mark Read" }).getByRole("button", {
      name: "Mark as unread",
    }),
  ).toBeVisible();

  // Scenario 4: ignoring requires confirmation and removes the item.
  await ignoreCard.getByRole("button", { name: "Ignore" }).click();
  const dialog = page.getByRole("dialog", { name: "Ignore this item?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Ignore" }).click();
  await expect(page.locator("a").filter({ hasText: "DevOps Item To Ignore" })).toHaveCount(0);

  // Scenario 5: a pending state change triggers the beforeunload guard.
  // `page.reload()` never settles once its own dialog is dismissed (the
  // navigation it was waiting on is cancelled), so it's deliberately not
  // awaited — only the dialog event, and then the page's unchanged state,
  // matter here.
  const dialogPromise = page.waitForEvent("dialog");
  page.reload().catch(() => undefined);
  const nativeDialog = await dialogPromise;
  expect(nativeDialog.type()).toBe("beforeunload");
  await nativeDialog.dismiss();
  await expect(
    page.locator("a").filter({ hasText: "DevOps Item To Mark Read" }).getByRole("button", {
      name: "Mark as unread",
    }),
  ).toBeVisible();

  // Scenario 6: Finish reading calls the workflow and reports inline.
  await page.getByRole("button", { name: "Finish reading" }).click();
  await expect(page.getByRole("alert", { name: "Finished reading" })).toContainText(
    "Your reading state was committed and pushed.",
  );
});
