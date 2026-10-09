const app = getApp();

Page({
  data: {
    empty: true,
    primaryAction: "goToSettings",
    actionLabel: "去设置",
    stages: [],
  },

  async onShow() {
    const view = await app.library.viewLibrary();
    this.setData({
      empty: view.empty,
      primaryAction: view.primaryAction,
      actionLabel: view.actionLabel || "",
      stages: (view.stages || []).map((stage) => ({
        stageId: stage.stageId,
        name: stage.name,
        showSummary: (stage.showTitles || []).join(" · "),
      })),
    });
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
