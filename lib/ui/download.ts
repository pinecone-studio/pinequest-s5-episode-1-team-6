// Saves a file on the user's computer (browser only). Nothing is uploaded.

export function downloadFile(name: string, content: string, type = 'application/json'): void {
  downloadBlob(name, new Blob([content], { type }));
}

export function downloadBlob(name: string, blob: Blob): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  // Free the file a moment later: revoking at once can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
