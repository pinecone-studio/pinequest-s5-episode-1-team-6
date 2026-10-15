// QR code for the judges' join link, as one SVG path (no React here; components/competition/JoinQr.tsx
// draws it). Uses qrcode-generator (no dependencies); error correction M survives a glare or a crease.

import qrcode from 'qrcode-generator';

export interface QrShape {
  /** Modules per side (the QR is size × size; draw it with a quiet zone around it). */
  size: number;
  /** SVG path data: one 1×1 square per dark module, in module units. */
  path: string;
}

export function qrShape(text: string): QrShape {
  const qr = qrcode(0, 'M'); // 0 = smallest version that fits the text
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  let path = '';
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`;
    }
  }
  return { size, path };
}
