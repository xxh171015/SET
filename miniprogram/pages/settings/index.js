const app = getApp();

Page({
  data: {
    draft: "",
  },

  async onShow() {
    const view = await app.library.viewSettings();
    this.setData({ draft: view.manifestUrl });
  },

  onDraftInput(event) {
    this.setData({ draft: event.detail.value });
  },

  async onSave() {
    await app.library.saveManifestUrl(this.data.draft);
    const view = await app.library.viewSettings();
    this.setData({ draft: view.manifestUrl });
  },

  async onRefresh() {
    await app.library.refresh();
    wx.switchTab({ url: "/pages/library/index" });
  },
});
