# Phase 5 — Spec Builder

Goal: write a test spec that exercises the flows in `test_description` using the screen classes from Phase 4.

## File naming

`apps/mobile/sample/tests/<feature>_<platform>.spec.ts`

The `_ios` / `_android` suffix is **load-bearing** — `testMatch` in `mobilewright.config.ts` routes specs by it. Never omit it.

## Template

```ts
import { test, expect } from '@mobilewright/test';
import { <Feature>Screen } from '../screens/<platform>/<feature>.screen';

const BUNDLE_ID = '<bundle-id>';

test.describe('<Feature> — <platform>', () => {
  test.describe.configure({ mode: 'serial' });

  test('<what this test proves>', async ({ device, screen }) => {
    const featureScreen = new <Feature>Screen(screen);

    await test.step('Launch fresh', async () => {
      await device.terminateApp(BUNDLE_ID).catch(() => {});
      await device.launchApp(BUNDLE_ID);
    });

    // use screen object methods only — no raw MobileUtils in spec body
    await featureScreen.doSomething({ value: 'example' });
    await featureScreen.expectAtScreen();
  });
});
```

## Rules

- `terminateApp` before `launchApp` in the test body — `afterEach` only guards subsequent runs, not the first
- Use `serial` mode when tests share state (add → edit → delete chains)
- No raw `MobileUtils` calls in the spec — everything through screen object methods
- Randomize test data that persists between runs: `` `Name-${Date.now()}` ``
- One `test.describe` per feature; one `test()` per logical scenario

## Run the spec

```bash
npm run test:mobile -- --project=<platform> apps/mobile/sample/tests/<feature>_<platform>.spec.ts
```

If the test fails, diagnose from the error output and fix before proceeding to review. Common causes:
- App resumed from snapshot-capture state → verify `terminateApp` is present
- Screen object method fails → check locator matches actual view tree
- Wrong `expectAtScreen()` element → verify both elements are unique to that screen

## State update

```yaml
current_phase: 6
phase_results:
  spec_builder:
    status: done
    spec_file: "apps/mobile/sample/tests/<feature>_<platform>.spec.ts"
updated_at: "<ISO-8601>"
```
