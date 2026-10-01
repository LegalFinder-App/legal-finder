// Desktop counterpart of files.ts. A picked file is a blob: (or data:) URL here, and "share or
// save" becomes the desktop's Save dialog.

export async function readFileBytes(uri: string): Promise<ArrayBuffer> {
  return (await fetch(uri)).arrayBuffer();
}

export async function formFile(uri: string, name: string, type: string): Promise<Blob> {
  const blob = await (await fetch(uri)).blob();
  return new File([blob], name, { type });
}

export async function saveOrShareFile(url: string, name: string) {
  // Fetched first so the browser engine treats it as a download with our file name; a link
  // straight to another origin would ignore the name and just navigate.
  const blob = await (await fetch(url)).blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}
