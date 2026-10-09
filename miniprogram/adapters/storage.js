const MANIFEST_URL_KEY = "manifestUrl";
const LAST_MANIFEST_KEY = "lastManifest";
const WATCH_PROGRESS_KEY = "watchProgress";

function createWxStorage() {
  return {
    getManifestUrl() {
      try {
        const value = wx.getStorageSync(MANIFEST_URL_KEY);
        return Promise.resolve(value == null ? "" : String(value));
      } catch (err) {
        return Promise.resolve("");
      }
    },
    setManifestUrl(url) {
      wx.setStorageSync(MANIFEST_URL_KEY, url);
      return Promise.resolve();
    },
    getLastManifest() {
      try {
        const value = wx.getStorageSync(LAST_MANIFEST_KEY);
        return Promise.resolve(value == null || value === "" ? null : value);
      } catch (err) {
        return Promise.resolve(null);
      }
    },
    setLastManifest(body) {
      if (body == null) {
        wx.removeStorageSync(LAST_MANIFEST_KEY);
      } else {
        wx.setStorageSync(LAST_MANIFEST_KEY, body);
      }
      return Promise.resolve();
    },
    getWatchProgress() {
      try {
        const value = wx.getStorageSync(WATCH_PROGRESS_KEY);
        if (value == null || typeof value !== "object" || Array.isArray(value)) {
          return Promise.resolve({});
        }
        return Promise.resolve(value);
      } catch (_err) {
        return Promise.resolve({});
      }
    },
    setWatchProgress(watchProgressByEpisodeId) {
      wx.setStorageSync(WATCH_PROGRESS_KEY, watchProgressByEpisodeId || {});
      return Promise.resolve();
    },
  };
}

module.exports = { createWxStorage };
