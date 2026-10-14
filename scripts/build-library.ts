// Regenerates the pose examples shipped with the app:
//   lib/library/defaultLibrary.json   rhythmic gymnastics balances
//   lib/ballet/defaultLibrary.json    ballet poses
// Run after changing lib/library/signature.ts, lib/elements/balanceFrame.ts, lib/library/examples/poses.ts,
// lib/ballet/frame.ts or lib/ballet/examples/poses.ts:
//   npm run build-library
// Pose signatures only (numbers): no images, no names.

import { writeFileSync } from 'node:fs';
import { buildBalletLibrary, buildDefaultLibrary } from './buildDefaultLibrary';

for (const [out, library] of [
  ['lib/library/defaultLibrary.json', buildDefaultLibrary()],
  ['lib/ballet/defaultLibrary.json', buildBalletLibrary()],
] as const) {
  const json = JSON.stringify(library.toJSON());
  writeFileSync(out, `${json}\n`);
  console.log(`Wrote ${out} (${json.length + 1} bytes)`);
}
