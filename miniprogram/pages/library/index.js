const app = getApp();

Page({
  data: {
    empty: true,
    primaryAction: "goToSettings",
    actionLabel: "去设置",
  },

  async onShow() {
    const view = await app.library.viewLibrary();
    this.setData({
      empty: view.empty,
      primaryAction: view.primaryAction,
      actionLabel: view.actionLabel || "",
    });
  },

  goToSettings() {
    wx.switchTab({ url: "/pages/settings/index" });
  },
});
