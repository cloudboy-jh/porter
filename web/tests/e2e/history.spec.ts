import { expect, test } from '@playwright/test';

test.skip('history page loads', async ({ page }) => {
	await page.goto('/history');
	await expect(page.getByText('History Table')).toBeVisible();
});
