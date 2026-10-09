const app = getApp();

Page({
  data: {
    title: "",
    source: "",
    playbackRate: 1,
    rates: [],
    positionSeconds: 0,
    playbackFailed: false,
    copy: "",
    actionLabel: "返回",
  },

  async onLoad(options) {
    this.episodeId = options.episodeId;
    this.positionSeconds = 0;
    this.durationSeconds = 0;
    this.skipProgress = false;
    const view = await app.library.viewEpisode(this.episodeId);
    this.positionSeconds = view.positionSeconds || 0;
    this.skipProgress = Boolean(view.playbackFailed);
    wx.setNavigationBarTitle({ title: view.title || "播放" });
    this.setData({
      title: view.title || "",
      source: view.source || "",
      playbackRate: view.playbackRate,
      rates: view.rates || [],
      positionSeconds: this.positionSeconds,
      playbackFailed: Boolean(view.playbackFailed),
      copy: view.copy || "",
      actionLabel: view.actionLabel || "返回",
    });
  },

  onReady() {
    this.videoContext = wx.createVideoContext("episode", this);
  },

  onPlay() {
    app.library.playEpisode(this.episodeId);
  },

  onTimeUpdate(event) {
    const currentTime = event.detail.currentTime;
    const duration = event.detail.duration;
    if (typeof currentTime === "number") {
      this.positionSeconds = currentTime;
    }
    if (typeof duration === "number" && duration > 0) {
      this.durationSeconds = duration;
    }
  },

  onEnded() {
    if (this.durationSeconds > 0) {
      this.positionSeconds = this.durationSeconds;
    }
    this.saveProgress();
  },

  onHide() {
    this.saveProgress();
  },

  onUnload() {
    this.saveProgress();
  },

  async onError() {
    this.skipProgress = true;
    const view = await app.library.sourceFailed(this.episodeId);
    this.setData({
      playbackFailed: true,
      copy: view.copy || "",
      actionLabel: view.actionLabel || "返回",
    });
  },

  async saveProgress() {
    if (!this.episodeId || this.skipProgress) {
      return;
    }
    await app.library.leaveEpisode(this.episodeId, {
      positionSeconds: this.positionSeconds || 0,
      durationSeconds: this.durationSeconds || 0,
    });
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
