// Replays recorded body points through the same detectors as the live app and prints the judged moves.
//   npm run replay -- path/to/landmarks.json [more.json ...] [--frames]
// Landmark files: "Export body points" on /tools/video-analyze (numbers only, no images).
// --frames also prints the balance measurements of every frame, for tuning thresholds.

import { readFileSync } from 'node:fs';
import { replayLandmarks, type LandmarkRecording } from '../lib/tools/replay';
import { PoseLibrary, type LibraryJSON } from '../lib/library/recognizer';

const args = process.argv.slice(2);
const showFrames = args.includes('--frames');
const library = PoseLibrary.fromJSON(JSON.parse(readFileSync('lib/library/defaultLibrary.json', 'utf8')) as LibraryJSON);

for (const file of args.filter((a) => !a.startsWith('--'))) {
  const recording = JSON.parse(readFileSync(file, 'utf8')) as LandmarkRecording;
  const result = replayLandmarks(recording, library);
  console.log(`\n=== ${file} (${recording.frames.length} frames)`);
  if (showFrames) for (const line of result.frameLines) console.log(line);
  if (result.events.length === 0) console.log('  no judged moves');
  for (const e of result.events) {
    const ded = e.penalties.reduce((sum, p) => sum + p.value, 0);
    console.log(`  ${(e.tStart / 1000).toFixed(1)}-${(e.tEnd / 1000).toFixed(1)} s  ${e.element} (${e.code})  D ${e.dbValue.toFixed(2)}  E -${ded.toFixed(2)}`
      + `  ${JSON.stringify(e.measurements)}`);
    for (const p of e.penalties) console.log(`      -${p.value.toFixed(2)} ${p.reason}`);
    for (const w of e.warnings) console.log(`      ! ${w}`);
  }
}
