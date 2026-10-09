const app = getApp();

Page({
  data: {
    shows: [],
  },

  onLoad(options) {
    this.stageId = options.stageId;
  },

  async onShow() {
    const view = await app.library.viewStage(this.stageId);
    wx.setNavigationBarTitle({ title: view.name || "片库" });
    this.setData({ shows: view.shows || [] });
  },

  openShow(event) {
    const showKey = event.currentTarget.dataset.showKey;
    wx.navigateTo({
      url: `/pages/show/index?showKey=${encodeURIComponent(showKey)}`,
    });
  },
});
