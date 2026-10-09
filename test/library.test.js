const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createLibrary } = require("../miniprogram/library");

function memoryStorage(initialManifestUrl = "") {
  let manifestUrl = initialManifestUrl;
  return {
    async getManifestUrl() {
      return manifestUrl;
    },
    async setManifestUrl(url) {
      manifestUrl = url;
    },
  };
}

describe("Library", () => {
  it("empty Manifest URL shows empty Library with 去设置, not 刷新", async () => {
    const library = createLibrary({ storage: memoryStorage() });
    const view = await library.viewLibrary();

    assert.equal(view.empty, true);
    assert.deepEqual(view.episodes, []);
    assert.equal(view.primaryAction, "goToSettings");
    assert.equal(view.actionLabel, "去设置");
  });

  it("saved Manifest URL persists on this install", async () => {
    const storage = memoryStorage();
    const library = createLibrary({ storage });
    await library.saveManifestUrl("https://example.com/manifest.json");

    const relaunched = createLibrary({ storage });
    const settings = await relaunched.viewSettings();
    assert.equal(settings.manifestUrl, "https://example.com/manifest.json");
  });

  it("stored Manifest URL does not invent Episodes or offer 刷新", async () => {
    const library = createLibrary({ storage: memoryStorage() });
    await library.saveManifestUrl("https://example.com/manifest.json");
    const view = await library.viewLibrary();

    assert.deepEqual(view.episodes, []);
    assert.equal(view.primaryAction, null);
    assert.notEqual(view.actionLabel, "刷新");
  });

  it("saving an empty Manifest URL returns empty Library with 去设置 and no Episodes", async () => {
    const library = createLibrary({ storage: memoryStorage() });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.saveManifestUrl("");

    const view = await library.viewLibrary();
    const settings = await library.viewSettings();

    assert.equal(settings.manifestUrl, "");
    assert.equal(view.empty, true);
    assert.deepEqual(view.episodes, []);
    assert.equal(view.primaryAction, "goToSettings");
    assert.equal(view.actionLabel, "去设置");
  });

  it("继续看 is empty in-progress when nothing is underway", async () => {
    const library = createLibrary({ storage: memoryStorage() });
    const view = await library.viewInProgress();

    assert.equal(view.empty, true);
    assert.deepEqual(view.episodes, []);
    assert.equal(view.copy, "还没有看到一半的 Episode。");
  });
});
