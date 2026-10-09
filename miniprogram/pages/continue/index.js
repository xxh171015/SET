const app = getApp();

Page({
  data: {
    empty: true,
    copy: "",
  },

  async onShow() {
    const view = await app.library.viewInProgress();
    this.setData({
      empty: view.empty,
      copy: view.copy,
    });
  },
});
