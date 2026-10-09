const app = getApp();

Page({
  data: {
    empty: true,
    stale: false,
    copy: "",
    primaryAction: "goToSettings",
    actionLabel: "去设置",
    refreshLabel: "",
    stages: [],
  },

  async onShow() {
    await this.showLibrary();
  },

  async showLibrary() {
    const view = await app.library.viewLibrary();
    this.setData({
      empty: view.empty,
      stale: Boolean(view.stale),
      copy: view.copy || "",
      primaryAction: view.primaryAction,
      actionLabel: view.actionLabel || "",
      refreshLabel: view.refreshLabel || "",
      stages: (view.stages || []).map((stage) => ({
        stageId: stage.stageId,
        name: stage.name,
        showSummary: (stage.showTitles || []).join(" · "),
      })),
    });
  },

  async onRefresh() {
    await this.showLibrary();
  },

  goToSettings() {
    wx.switchTab({ url: "/pages/settings/index" });
  },

  openStage(event) {
    const stageId = event.currentTarget.dataset.stageId;
    wx.navigateTo({
      url: `/pages/stage/index?stageId=${encodeURIComponent(stageId)}`,
    });
  },
});
