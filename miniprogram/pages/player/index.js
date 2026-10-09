const app = getApp();

Page({
  data: {
    title: "",
    source: "",
    playbackRate: 1,
    rates: [],
  },

  async onLoad(options) {
    this.episodeId = options.episodeId;
    const view = await app.library.viewEpisode(this.episodeId);
    wx.setNavigationBarTitle({ title: view.title || "播放" });
    this.setData({
      title: view.title || "",
      source: view.source || "",
      playbackRate: view.playbackRate,
      rates: view.rates || [],
    });
  },

  onReady() {
    this.videoContext = wx.createVideoContext("episode", this);
  },

  async setRate(event) {
    const rate = Number(event.currentTarget.dataset.rate);
    const view = await app.library.setPlaybackRate(rate);
    this.setData({ playbackRate: view.playbackRate });
    if (this.videoContext) {
      this.videoContext.playbackRate(view.playbackRate);
    }
  },

  goBack() {
    wx.navigateBack();
  },
});
