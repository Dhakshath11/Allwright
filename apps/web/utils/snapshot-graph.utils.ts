import * as fs from 'fs';
import * as path from 'path';
import { test } from '@playwright/test';
import type { Page } from '@playwright/test';

// On-disk shape of one capture — treeYaml is Playwright's own ariaSnapshot() output, not a hand-rolled DOM dump.
export interface SnapshotGraph {
  capturedAt: string;
  pageUrl: string;
  scope: 'modal' | 'full-page';
  treeYaml: string;
}

// Matches either ARIA convention a modal might use to announce itself: role="dialog" or aria-modal="true".
const ROOT_SELECTOR = '[role="dialog"], [aria-modal="true"]';

// The only place this module actually touches the accessibility tree — everything else is disk/rotation bookkeeping.
const captureTreeYaml = async (page: Page, selector: string): Promise<string> => {
  return page.locator(selector).first().ariaSnapshot();
};

// recursive mkdir so callers don't need to pre-create the output directory.
const writeJson = (filePath: string, payload: unknown): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
};

// Manual 4-slot ring buffer (current + 3 prior versions) per key, shifted oldest-last so renames never clobber data out of order.
const rotateRingBuffer = (directory: string, key: string): void => {
  const v3 = path.join(directory, `${key}.v3.json`);
  const v2 = path.join(directory, `${key}.v2.json`);
  const v1 = path.join(directory, `${key}.v1.json`);
  const current = path.join(directory, `${key}.current.json`);

  if (fs.existsSync(v3)) {
    fs.unlinkSync(v3);
  }

  if (fs.existsSync(v2)) {
    fs.renameSync(v2, v3);
  }

  if (fs.existsSync(v1)) {
    fs.renameSync(v1, v2);
  }

  if (fs.existsSync(current)) {
    fs.renameSync(current, v1);
  }
};

// Captures the current aria tree (scoped to an open modal if one exists, else the whole page), rotates it into the ring buffer, and attaches it to the Playwright report.
export const captureAndStoreSnapshotGraph = async (
  page: Page,
  key: string,
  outputDirectory: string,
): Promise<void> => {
  // .catch(() => false): a failed modal-detection check should never crash the whole capture.
  const hasModal = await page.locator(ROOT_SELECTOR).first().isVisible().catch(() => false);
  const selector = hasModal ? ROOT_SELECTOR : 'body';

  const graph: SnapshotGraph = {
    capturedAt: new Date().toISOString(),
    pageUrl: page.url(),
    scope: hasModal ? 'modal' : 'full-page',
    treeYaml: await captureTreeYaml(page, selector),
  };

  rotateRingBuffer(outputDirectory, key);
  writeJson(path.join(outputDirectory, `${key}.current.json`), graph);

  // Surfaces the same evidence trail written to disk directly in the Playwright
  // HTML report, so CI visibility doesn't depend on cross-referencing smart-snapshots/.
  await test.info().attach(`smart-snapshot-${key}`, {
    body: JSON.stringify(graph, null, 2),
    contentType: 'application/json',
  });
};
