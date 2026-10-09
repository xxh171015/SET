const app = getApp();

Page({
  data: {
    episodes: [],
  },

  onLoad(options) {
    this.showKey = options.showKey;
  },

  async onShow() {
    const view = await app.library.viewShow(this.showKey);
    wx.setNavigationBarTitle({ title: view.title || "片库" });
    this.setData({ episodes: view.episodes || [] });
  },

  openEpisode(event) {
    const episodeId = event.currentTarget.dataset.episodeId;
    wx.navigateTo({
      url: `/pages/player/index?episodeId=${encodeURIComponent(episodeId)}`,
    });
  },
});
