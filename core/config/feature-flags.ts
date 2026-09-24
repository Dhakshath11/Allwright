const truthy = new Set(['1', 'true', 'yes', 'on']);

const readFlag = (name: string, fallback = false): boolean => {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }

  return truthy.has(raw.trim().toLowerCase());
};

// Both default off — smart locator/snapshot capture must be opted into per-run via env var, never on by accident.
export const isSmartLocatorEnabled = (): boolean => readFlag('SMART_LOCATOR', false);

// Independent of SMART_LOCATOR — gates only the snapshot-graph capture side-effect (goto/healing), not the resolution cascade itself.
export const isSmartSnapshotCaptureEnabled = (): boolean => readFlag('SMART_SNAPSHOT_CAPTURE', false);
