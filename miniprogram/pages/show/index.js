const app = getApp();
const {
  formatLastPlayedAt,
  formatProgress,
} = require("../../formatLastPlayedAt.js");

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
    this.setData({
      episodes: (view.episodes || []).map((episode) => ({
        episodeId: episode.episodeId,
        title: episode.title,
        completed: episode.completed,
        lastPlayedDate: episode.completed
          ? formatLastPlayedAt(episode.lastPlayedAt)
          : "",
        progressLabel: formatProgress(
          episode.positionSeconds,
          episode.durationSeconds,
        ),
      })),
    });
  },

  openEpisode(event) {
    const episodeId = event.currentTarget.dataset.episodeId;
    wx.navigateTo({
      url: `/pages/player/index?episodeId=${encodeURIComponent(episodeId)}`,
    });
  },
});
