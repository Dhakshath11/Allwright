import { expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { LocatorActionError } from '../../../core/utils/locator-error';
import {
  isSmartLocatorEnabled,
  isSmartSnapshotCaptureEnabled,
} from '../../../core/config/feature-flags';
import {
  buildSmartLocatorFromProfile,
  extractLiveSemanticSnapshot,
  listHistoryCandidates,
  locatorFromStrategy,
  type SmartElementProfile,
  type SmartLocatorStrategy,
  type SmartRegistry,
  type SmartWebLocator,
} from './smart-locator.utils';
import { captureAndStoreSnapshotGraph } from './snapshot-graph.utils';
import { findSuggestion } from './suggestion-search.utils';
import type { WebLocator } from './web.utils';
import {
  confidenceTierForScore,
  scoreCandidateSimilarity,
} from './similarity-engine.utils';
import type { LocatorSuggestion } from '../../../core/utils/locator-error';

type ConfidenceTier = ReturnType<typeof confidenceTierForScore>;

interface HealingArtifact {
  capturedAt: string;
  elementId: string;
  action: string;
  failedCandidates: string[];
  selectedCandidate?: string;
  score?: number;
  tier: ConfidenceTier;
  breakdown?: {
    role: number;
    name: number;
    text: number;
    tag: number;
  };
  suggestion?: LocatorSuggestion;
}

const SMART_REPORTS_DIR = path.join(__dirname, '..', 'sample', 'resources', 'smart-reports');
const SMART_SNAPSHOTS_DIR = path.join(__dirname, '..', 'sample', 'resources', 'smart-snapshots');

// Resolves a registry filename against sample/resources/registry/ so screen objects don't hardcode that path.
export const resolveRegistryPath = (relativePath: string): string => {
  return path.join(__dirname, '..', 'sample', 'resources', 'registry', relativePath);
};

export class SmartWebUtils {
  constructor(
    private readonly page: Page,
    private readonly registry: SmartRegistry,
  ) { }

  // Loads a registry JSON file from disk and holds it in memory for the lifetime of this instance.
  static fromRegistryFile(page: Page, registryPath: string): SmartWebUtils {
    const raw = fs.readFileSync(registryPath, 'utf-8');
    const parsed = JSON.parse(raw) as SmartRegistry;
    return new SmartWebUtils(page, parsed);
  }

  // Looks up one element's static registry data by id, or fails fast if the id was never registered.
  // e.g. profile: { id: "newTodoInput", preferredLocator: { kind: "role", role: "textbox", name: "What needs to be done?" }, fallbackLocators: [...], semanticSnapshot: {...}, history: [...] }
  private getProfile(elementId: string): SmartElementProfile {
    const profile = this.registry.elements.find(item => item.id === elementId);
    if (profile === undefined) {
      throw new Error(`Smart element profile not found: ${elementId}`);
    }

    return profile;
  }

  // Lazy — no DOM query happens here. Candidate builders only run once an
  // action (fill/tap/...) later calls SmartWebLocator.resolve().
  getByElementId(elementId: string): SmartWebLocator {
    const profile = this.getProfile(elementId);
    if (!isSmartLocatorEnabled()) { // If the feature flag is off, we still want to return a SmartWebLocator, but it will only use the preferred locator and not attempt any healing.
      return buildSmartLocatorFromProfile(this.page, {
        ...profile,
        fallbackLocators: [],  // No fallback locators when the feature flag is off. Overrides to null any defined in the profile.
      });
    }

    // createHealingResolver only builds a closure here — its body doesn't run until resolve() exhausts every candidate (see SMART_LOCATOR_ARCHITECTURE.md §8.1). If body is not executed, then Creation Of healing Resolver is not actually called!.
    return buildSmartLocatorFromProfile(this.page, profile, this.createHealingResolver(profile));
  }

  // Turns a strategy into a short, human-readable label for logs/artifacts — role is the only kind without a `.value`.
  private strategyDescription(strategy: SmartLocatorStrategy): string {
    switch (strategy.kind) {
      case 'css':
      case 'placeholder':
      case 'label':
      case 'text':
      case 'testId':
        return `${strategy.kind}:${strategy.value}`;
      case 'role':
        return `role:${strategy.role}:${strategy.name ?? ''}`;
    }
  }

  // Just builds and returns the closure below — construction is instant/cheap.
  // The body only runs later, lazily, when SmartWebLocator.resolve() calls it as a last resort.
  private createHealingResolver(profile: SmartElementProfile) {
    return async (params: { action: string; failedCandidates: string[] }) => {
      const candidates = listHistoryCandidates(profile);
      // Starts empty — populated only if a history candidate resolves and out-scores the current best.
      let best:
        | {
          locator: WebLocator;
          score: number;
          description: string;
          breakdown: { role: number; name: number; text: number; tag: number };
        }
        | undefined;

      for (const strategy of candidates) {
        const description = `history:${this.strategyDescription(strategy)}`;
        const locator = locatorFromStrategy(this.page, strategy);

        const count = await locator.count();
        if (count === 0) {
          continue;
        }
        // At this point, we have a candidate that exists in the DOM — proceed to evaluate its semantic similarity. 
        const liveSnapshot = await extractLiveSemanticSnapshot(locator, { registry: this.registry });
        const similarity = scoreCandidateSimilarity(profile.semanticSnapshot, liveSnapshot);
        if (best === undefined || similarity.score > best.score) {
          best = {
            locator,
            score: similarity.score,
            description,
            breakdown: similarity.breakdown,
          };
        }
      }

      // Evidence trail: records the page's DOM/aria state at the moment of
      // this healing attempt, correlated by elementId with the smart-reports/ artifact below.
      // Captured unconditionally here — before we know if healing succeeded — so the snapshot
      // reflects the page at decision time, whether the outcome is a heal or a fail.
      if (isSmartSnapshotCaptureEnabled()) {
        await captureAndStoreSnapshotGraph(this.page, profile.id, SMART_SNAPSHOTS_DIR);
      }

      const tier = confidenceTierForScore(best?.score ?? 0);

      // Last resort: only searched when healing itself has nothing usable.
      // Provide Locator Suggestion in report if no suitable candidate was found or if the confidence tier is 'fail'.
      const suggestion =
        best === undefined || tier === 'fail'
          ? await findSuggestion(this.page, profile.semanticSnapshot)
          : undefined;

      // Assembles the on-disk evidence record for this one healing attempt — written
      // unconditionally by writeHealingArtifact() below, whether the outcome is a heal
      // or a fail, so smart-reports/ always has a trail correlated by elementId.
      //
      // e.g. a successful heal (best found, tier 'auto'):
      //   {
      //     capturedAt: "2026-09-24T10:00:00.000Z",
      //     elementId: "add-todo-input",
      //     action: "fill",
      //     failedCandidates: ["#new-todo"],
      //     selectedCandidate: "getByRole('textbox', { name: 'What needs to be done?' })",
      //     score: 0.97,
      //     tier: "auto",
      //     breakdown: { role: 1, name: 1, text: 1, tag: 1 },
      //     suggestion: undefined,
      //   }
      //
      // e.g. a failed heal (nothing usable, suggestion stage kicks in instead):
      //   {
      //     capturedAt: "2026-09-24T10:00:00.000Z",
      //     elementId: "add-todo-input",
      //     action: "fill",
      //     failedCandidates: ["#new-todo", "getByRole('textbox', { name: '...' })"],
      //     selectedCandidate: undefined,
      //     score: undefined,
      //     tier: "fail",
      //     breakdown: undefined,
      //     suggestion: {
      //       score: 0.667,
      //       semantics: { role: "textbox", name: "What needs to be done?", text: "", tag: "input" },
      //       constructedLocator: { kind: "css", value: "#new-todo" },
      //     },
      //   }
      const artifact: HealingArtifact = {
        capturedAt: new Date().toISOString(),
        elementId: profile.id,
        action: params.action,
        failedCandidates: params.failedCandidates,
        selectedCandidate: best?.description,
        score: best?.score,
        tier,
        breakdown: best?.breakdown,
        suggestion,
      };
      await this.writeHealingArtifact(artifact);

      if (best === undefined || tier === 'fail') {
        return {
          succeeded: false,
          failedCandidates: params.failedCandidates,
          score: best?.score,
          tier,
          suggestion,
        };
      }

      return {
        succeeded: true,
        selectedLocator: best.locator,
        selectedCandidate: best.description,
        score: best.score,
        tier,
        failedCandidates: params.failedCandidates,
      };
    };
  }

  // Writes the same serialized artifact to two destinations: a JSON file on disk (persists across runs) and a Playwright HTML report attachment (visible inline in CI).
  private async writeHealingArtifact(artifact: HealingArtifact): Promise<void> {
    fs.mkdirSync(SMART_REPORTS_DIR, { recursive: true });
    const stamp = artifact.capturedAt.replaceAll(':', '-');
    const fileName = `${artifact.elementId}.${artifact.action}.${stamp}.json`;
    const content = JSON.stringify(artifact, null, 2);
    fs.writeFileSync(path.join(SMART_REPORTS_DIR, fileName), content);

    // Surfaces the same evidence trail written to disk directly in the Playwright
    // HTML report, so CI visibility doesn't depend on cross-referencing smart-reports/.
    await test.info().attach(`smart-healing-report-${artifact.elementId}`, {
      body: content,
      contentType: 'application/json',
    });
  }

  async goto(url: string, snapshotKey: string, snapshotDir: string): Promise<void> {
    await this.page.goto(url);
    // Evidence trail only — establishes the first on-disk data point for this snapshotKey even
    // if healing never triggers for this page. Nothing currently auto-diffs this against later
    // snapshots; comparison, if needed, is manual (open the JSON files or Playwright report
    // attachments side by side). Opt-in and free otherwise: gated by SMART_SNAPSHOT_CAPTURE,
    // which defaults to false, so this costs nothing unless explicitly enabled.
    // Note: this is one of exactly two call sites for captureAndStoreSnapshotGraph — the other is
    // inside createHealingResolver's closure, during a healing attempt. Both share this same
    // SMART_SNAPSHOT_CAPTURE flag and are independent of SMART_LOCATOR (the healing on/off master
    // switch) — turning snapshot capture off never disables healing itself. See
    // SMART_LOCATOR_ARCHITECTURE.md §3 and §8 step 3.
    if (isSmartSnapshotCaptureEnabled()) {
      await captureAndStoreSnapshotGraph(this.page, snapshotKey, snapshotDir);
    }
  }

  async fill(locator: SmartWebLocator, text: string): Promise<void> {
    try {
      await locator.fill(text);
    } catch (cause) {
      throw new LocatorActionError('smartFill', 'smart locator', cause);
    }
  }

  async click(locator: SmartWebLocator): Promise<void> {
    try {
      await locator.tap();
    } catch (cause) {
      throw new LocatorActionError('smartClick', 'smart locator', cause);
    }
  }

  async pressKey(locator: SmartWebLocator, key: string): Promise<void> {
    try {
      const raw = await locator.resolvePlaywrightLocator(`pressKey:${key}`);
      await raw.press(key);
    } catch (cause) {
      throw new LocatorActionError(`smartPressKey('${key}')`, 'smart locator', cause);
    }
  }

  async expectVisible(locator: SmartWebLocator): Promise<void> {
    const raw = await locator.resolvePlaywrightLocator('expectVisible');
    await expect(raw).toBeVisible();
  }

  async expectCount(locator: SmartWebLocator, count: number): Promise<void> {
    const raw = await locator.resolvePlaywrightLocator('expectCount');
    await expect(raw).toHaveCount(count);
  }
}
