const { createLibrary } = require("./library/index.js");
const { createWxStorage } = require("./adapters/storage.js");
const { createWxHttp } = require("./adapters/http.js");

App({
  onLaunch() {
    this.library = createLibrary({
      storage: createWxStorage(),
      http: createWxHttp(),
    });
    this.library.refresh();
  },
});
