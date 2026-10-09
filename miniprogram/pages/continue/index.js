const app = getApp();
const {
  formatLastPlayedAt,
  formatProgress,
} = require("../../formatLastPlayedAt.js");

Page({
  data: {
    empty: true,
    copy: "",
    actionLabel: "",
    episodes: [],
  },

  async onShow() {
    const view = await app.library.viewInProgress();
    this.setData({
      empty: view.empty,
      copy: view.copy || "",
      actionLabel: view.actionLabel || "",
      episodes: (view.episodes || []).map((episode) => ({
        episodeId: episode.episodeId,
        title: episode.title,
        lastPlayedDate: formatLastPlayedAt(episode.lastPlayedAt),
        progressLabel: formatProgress(
          episode.positionSeconds,
          episode.durationSeconds,
        ),
      })),
    });
  },

  goToLibrary() {
    wx.switchTab({ url: "/pages/library/index" });
  },

  openEpisode(event) {
    const episodeId = event.currentTarget.dataset.episodeId;
    wx.navigateTo({
      url: `/pages/player/index?episodeId=${encodeURIComponent(episodeId)}`,
    });
  },
});
