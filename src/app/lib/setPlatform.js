// change store name according to file names
export default function setPlatform(stores) {
  const result = [];
  const seenPlatforms = new Set();

  for (const store of stores) {
    const name = store.platform.name.toLowerCase();
    let normalized;

    if (name.includes("playstation")) {
      normalized = "Sony PS";
    } else if (name.includes("nintendo")) {
      normalized = "Nintendo";
    } else if (name.includes("steam")) {
      normalized = "PC";
    } else if (name.includes("xbox")) {
      normalized = "Xbox";
    } else {
      normalized = store.platform.name;
    }

    if (seenPlatforms.has(normalized)) continue;
    seenPlatforms.add(normalized);

    // Pick an ID (first occurrence) for this platform
    result.push({ id: store.platform.id, name: normalized });
  }

  return result;
}
