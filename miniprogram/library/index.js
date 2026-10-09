function createLibrary({ storage }) {
  return {
    async viewLibrary() {
      const manifestUrl = ((await storage.getManifestUrl()) || "").trim();
      if (!manifestUrl) {
        return {
          empty: true,
          episodes: [],
          primaryAction: "goToSettings",
          actionLabel: "去设置",
        };
      }
      return {
        empty: true,
        episodes: [],
        primaryAction: null,
        actionLabel: null,
      };
    },

    async viewSettings() {
      const manifestUrl = (await storage.getManifestUrl()) || "";
      return { manifestUrl };
    },

    async saveManifestUrl(url) {
      await storage.setManifestUrl(String(url ?? "").trim());
    },

    async viewInProgress() {
      return {
        empty: true,
        episodes: [],
        copy: "还没有看到一半的 Episode。",
      };
    },
  };
}

module.exports = { createLibrary };
