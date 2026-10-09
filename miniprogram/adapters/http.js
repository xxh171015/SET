function createWxHttp() {
  return {
    getJson(url) {
      return new Promise((resolve, reject) => {
        wx.request({
          url,
          method: "GET",
          dataType: "json",
          success(res) {
            if (
              res.statusCode >= 200 &&
              res.statusCode < 300 &&
              res.data != null &&
              typeof res.data === "object"
            ) {
              resolve(res.data);
              return;
            }
            reject(new Error("Manifest fetch failed"));
          },
          fail: reject,
        });
      });
    },
  };
}

module.exports = { createWxHttp };
