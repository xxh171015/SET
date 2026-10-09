const { createLibrary } = require("./library/index.js");
const { createWxStorage } = require("./adapters/storage.js");

App({
  onLaunch() {
    this.library = createLibrary({ storage: createWxStorage() });
  },
});
