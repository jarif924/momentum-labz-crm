import assert from 'node:assert/strict';
import { launch, login, newNote } from './helpers.mjs';

const browser = await launch();
const { page } = await login(browser);
await newNote(page, `Audit table ${Date.now()}`);
await page.getByLabel('Add block').selectOption('table');
await page.locator('.bn-editor table td').first().click();
await page.keyboard.insertText('Table cell');

async function menu(label, item) {
  await page.locator('.bn-editor table td').first().hover();
  const handle = page.getByRole('button', { name: label, exact: true });
  await handle.waitFor();
  await handle.click();
  const action = page.getByRole('menuitem', { name: item, exact: true });
  await action.waitFor({ timeout: 10000 });
  await action.click();
  await action.waitFor({ state: 'hidden' });
}

await menu('Table row actions', 'Add row below');
assert.equal(await page.locator('.bn-editor table tr').count(), 3);
await menu('Table row actions', 'Delete row');
assert.equal(await page.locator('.bn-editor table tr').count(), 2);
await menu('Table column actions', 'Add column right');
assert.equal(await page.locator('.bn-editor table tr').first().locator('td').count(), 4);
await menu('Table column actions', 'Delete column');
assert.equal(await page.locator('.bn-editor table tr').first().locator('td').count(), 3);

console.log('PASS table row and column actions');
await browser.close();
