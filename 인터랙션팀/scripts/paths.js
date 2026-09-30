const appRoot = new URL("../", import.meta.url);

export function assetUrl(path) {
  return new URL(String(path).replace(/^\/+/, ""), appRoot).href;
}
