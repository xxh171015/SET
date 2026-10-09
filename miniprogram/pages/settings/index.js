const app = getApp();

Page({
  data: {
    manifestUrl: "",
  },

  async onShow() {
    const view = await app.library.viewSettings();
    this.setData({ manifestUrl: view.manifestUrl });
  },

  onManifestUrlInput(event) {
    this.setData({ manifestUrl: event.detail.value });
  },

  async onSave() {
    await app.library.saveManifestUrl(this.data.manifestUrl);
    const view = await app.library.viewSettings();
    this.setData({ manifestUrl: view.manifestUrl });
  },

  async onRefresh() {
    await app.library.refresh();
    wx.switchTab({ url: "/pages/library/index" });
  },
});
