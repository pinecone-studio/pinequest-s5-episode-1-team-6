// Saves text as a file on the user's computer (browser only). Nothing is uploaded.

export function downloadFile(name: string, content: string, type = 'application/json'): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  // Free the file a moment later: revoking at once can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
