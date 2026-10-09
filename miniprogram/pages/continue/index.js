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
    empty: true,
    copy: "",
    episodes: [],
  },

  async onShow() {
    const view = await app.library.viewInProgress();
    this.setData({
      empty: view.empty,
      copy: view.copy || "",
      episodes: (view.episodes || []).map((episode) => ({
        episodeId: episode.episodeId,
        title: episode.title,
        lastPlayedDate: formatLastPlayedAt(episode.lastPlayedAt),
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
