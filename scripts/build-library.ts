// Regenerates lib/library/defaultLibrary.json (the pose examples shipped with the app).
// Run after changing lib/library/signature.ts, lib/elements/balanceFrame.ts or lib/library/examples/poses.ts:
//   npm run build-library
// Pose signatures only (numbers): no images, no names.

import { writeFileSync } from 'node:fs';
import { buildDefaultLibrary } from './buildDefaultLibrary';

const OUT = 'lib/library/defaultLibrary.json';
const json = JSON.stringify(buildDefaultLibrary().toJSON());
writeFileSync(OUT, `${json}\n`);
console.log(`Wrote ${OUT} (${json.length + 1} bytes)`);
