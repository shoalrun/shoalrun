export type BuildProvenance = { sourceCommit?: string; releaseLabel?: string };

export function buildInfo(configDigest: string, provenance: BuildProvenance = {}) {
  const { sourceCommit, releaseLabel } = provenance;
  if (sourceCommit !== undefined && !/^(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/.test(sourceCommit)) {
    throw new Error('sourceCommit must be a full 40- or 64-character Git commit hash');
  }
  if (releaseLabel !== undefined && (!releaseLabel.trim() || releaseLabel.length > 128 || /[\x00-\x1f\x7f]/.test(releaseLabel))) {
    throw new Error('releaseLabel must be 1–128 printable characters');
  }
  return {
    schemaVersion: 1,
    configDigest,
    ...(sourceCommit ? { sourceCommit: sourceCommit.toLowerCase() } : {}),
    ...(releaseLabel ? { releaseLabel } : {})
  };
}
