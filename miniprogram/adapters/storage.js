const MANIFEST_URL_KEY = "manifestUrl";

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
  };
}

module.exports = { createWxStorage };
