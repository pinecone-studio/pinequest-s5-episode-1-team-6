import { test, assert, assertEqual } from './harness';
import { qrShape } from '../lib/competition/qr';
import { judgeLink } from '../lib/competition/links';

test('a judge link becomes a QR code small enough to scan from a laptop screen', () => {
  const link = judgeLink('https://rhymnast.pages.dev', 'TsTBneJeUvfkcGRk4469', 'mZSiP6RnbHl4xL2Ap5HfkjL');
  const qr = qrShape(link);
  assert(qr.size >= 21 && qr.size <= 49, `size ${qr.size}`);
  assert(qr.path.startsWith('M0 0h1v1h-1z'), 'top-left finder pattern starts dark');
});

test('the same link always gives the same QR code', () => {
  assertEqual(qrShape('https://example.com/judge?c=a&k=b').path, qrShape('https://example.com/judge?c=a&k=b').path);
});
