export const isMobileDevice = () => {
  if (typeof navigator === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(
    navigator.userAgent,
  );
};

export const urlToStoreType = (url = "") => {
  const u = url.toLowerCase();
  if (u.includes("store.steampowered.com") || u.includes("steam"))
    return "steam";
  if (u.includes("epicgames")) return "epicgames";
  if (u.includes("gog.com") || u.includes("gog")) return "gog";
  if (
    u.includes("playstation.com") ||
    u.includes("psn") ||
    u.includes("playstation")
  )
    return "playstation";
  if (
    u.includes("xbox.com") ||
    u.includes("microsoft.com") ||
    u.includes("xbox")
  )
    return "xbox";
  if (u.includes("nintendo") || u.includes("eshop")) return "nintendo";
  return "website";
};

export const choosePrimaryStoreLink = (
  storeLinks = [],
  preferMobile = false,
) => {
  if (!Array.isArray(storeLinks) || storeLinks.length === 0) return null;

  if (!preferMobile) {
    const steam = storeLinks.find((s) => urlToStoreType(s.url) === "steam");
    if (steam) return steam;
  }

  const priority = [
    "steam",
    "epicgames",
    "gog",
    "playstation",
    "xbox",
    "nintendo",
    "website",
  ];
  for (const type of priority) {
    const found = storeLinks.find((s) => urlToStoreType(s.url) === type);
    if (found) return found;
  }

  return storeLinks[0];
};

export const iconFilenameForStore = (store) => {
  const type = urlToStoreType(store.url || "");
  if (type && type !== "website") return `/${type}.svg`;
  return `/${store.name.toLowerCase().replace(/\s+/g, "")}.svg`;
};
