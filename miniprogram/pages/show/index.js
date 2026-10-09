const app = getApp();

function formatLastPlayedAt(iso) {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

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
        lastPlayedDate:
          episode.completed ? formatLastPlayedAt(episode.lastPlayedAt) : "",
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
