// CLI runner for registry-lint.utils.ts — walks apps/**/*.registry.json, prints
// every issue, and exits 1 only on 'error' severity. Wired into `npm run
// lint:registry` (via jiti, no build step) and the CI `lint` job. Run this
// after editing any *.registry.json to catch locator-priority regressions
// before they reach a real test run.
import * as fs from 'fs';
import * as path from 'path';
import { lintSmartRegistry } from '../apps/web/utils/registry-lint.utils';
import type { SmartRegistry } from '../apps/web/utils/smart-locator.utils';

const REPO_ROOT = path.join(__dirname, '..');

// Manual recursive walk (no glob dependency) — only need one suffix match.
const findRegistryFiles = (directory: string): string[] => {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return findRegistryFiles(fullPath);
    }

    return entry.name.endsWith('.registry.json') ? [fullPath] : [];
  }); 
};

// Cosmetic only — pads WARN/INFO to ERROR's width so log columns line up.
const severityTag: Record<string, string> = {
  error: 'ERROR',
  warning: 'WARN ',
  info: 'INFO ',
};

const run = (): void => {
  const registryFiles = findRegistryFiles(path.join(REPO_ROOT, 'apps'));

  if (registryFiles.length === 0) {
    console.log('[registry-lint] No *.registry.json files found under apps/.');
    return;
  }

  let hasError = false;

  for (const filePath of registryFiles) {
    const relativePath = path.relative(REPO_ROOT, filePath);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const registry = JSON.parse(raw) as SmartRegistry;
    const issues = lintSmartRegistry(registry);

    if (issues.length === 0) {
      console.log(`[registry-lint] OK   ${relativePath}`);
      continue;
    }

    // Every issue is printed regardless of severity; only 'error' affects the exit code.
    for (const issue of issues) {
      console.log(`[registry-lint] ${severityTag[issue.severity]} ${relativePath} :: ${issue.elementId} :: ${issue.message}`);
      if (issue.severity === 'error') {
        hasError = true;
      }
    }
  }

  // Checked once across all files, not per-file — one error anywhere fails the whole run.
  if (hasError) {
    console.error('\n[registry-lint] FAILED: one or more elements have a lower-priority locator as preferred.');
    process.exit(1);
  }

  console.log('\n[registry-lint] Passed.');
};

run();
