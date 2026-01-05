export function buildDeepLink(pathWithHash: string) {
  // Works in web + Tauri
  const origin = window.location.origin;
  if (pathWithHash.startsWith("http")) return pathWithHash;
  return `${origin}${pathWithHash}`;
}
