const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createLibrary } = require("../miniprogram/library");

function memoryStorage(initialManifestUrl = "") {
  let manifestUrl = initialManifestUrl;
  let lastManifest = null;
  return {
    async getManifestUrl() {
      return manifestUrl;
    },
    async setManifestUrl(url) {
      manifestUrl = url;
    },
    async getLastManifest() {
      return lastManifest;
    },
    async setLastManifest(body) {
      lastManifest = body;
    },
  };
}

function memoryHttp(body) {
  return {
    async getJson() {
      return body;
    },
    setBody(next) {
      body = next;
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

  it("saving an empty Manifest URL after a fetch returns empty Library", async () => {
    const library = createLibrary({
      storage: memoryStorage(),
      http: memoryHttp({
        "yakka-dee": [
          {
            episodeId: "yakka-dee-apple",
            title: "Apple",
            sortKey: "001",
            source: "https://cdn.example/yakka-dee-apple.mp4",
          },
        ],
      }),
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();
    await library.saveManifestUrl("");

    const view = await library.viewLibrary();
    const show = await library.viewShow("yakka-dee");

    assert.equal(view.empty, true);
    assert.equal(view.actionLabel, "去设置");
    assert.deepEqual(show.episodes, []);
  });

  it("launch GETs the Manifest so a known Show lists its Episodes", async () => {
    const http = memoryHttp({
      "yakka-dee": [
        {
          episodeId: "yakka-dee-apple",
          title: "Apple",
          sortKey: "001",
          source: "https://cdn.example/yakka-dee-apple.mp4",
        },
      ],
    });
    const library = createLibrary({
      storage: memoryStorage(),
      http,
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.viewLibrary();

    const show = await library.viewShow("yakka-dee");
    assert.equal(show.episodes[0].episodeId, "yakka-dee-apple");
    assert.equal(show.episodes[0].title, "Apple");
  });

  it("片库 lists the four Stages after a successful Manifest fetch", async () => {
    const library = createLibrary({
      storage: memoryStorage(),
      http: memoryHttp({}),
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    const view = await library.viewLibrary();

    assert.equal(view.empty, false);
    assert.deepEqual(
      view.stages.map((stage) => stage.stageId),
      ["beginner", "intermediate", "advanced", "ultimate"],
    );
    assert.deepEqual(
      view.stages.map((stage) => stage.name),
      ["初级", "中级", "高级", "终级"],
    );
  });

  it("片库 Stage home has no 继续 banner", async () => {
    const library = createLibrary({
      storage: memoryStorage(),
      http: memoryHttp({}),
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    const view = await library.viewLibrary();

    assert.equal(view.continueBanner, false);
  });

  it("a Stage lists only its fixed Shows", async () => {
    const library = createLibrary({
      storage: memoryStorage(),
      http: memoryHttp({}),
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();

    const beginner = await library.viewStage("beginner");
    assert.equal(beginner.name, "初级");
    assert.deepEqual(
      beginner.shows.map((show) => show.showKey),
      ["yakka-dee", "cocomelon"],
    );
    assert.deepEqual(
      beginner.shows.map((show) => show.title),
      ["Yakka Dee", "CoComelon"],
    );

    const intermediate = await library.viewStage("intermediate");
    assert.deepEqual(
      intermediate.shows.map((show) => show.title),
      ["Peter Rabbit"],
    );

    const advanced = await library.viewStage("advanced");
    assert.deepEqual(
      advanced.shows.map((show) => show.title),
      ["BoJack Horseman"],
    );

    const ultimate = await library.viewStage("ultimate");
    assert.equal(ultimate.name, "终级");
    assert.deepEqual(
      ultimate.shows.map((show) => show.showKey),
      ["tbbt", "friends", "two-broke-girls"],
    );
    assert.deepEqual(
      ultimate.shows.map((show) => show.title),
      ["The Big Bang Theory", "Friends", "2 Broke Girls"],
    );
  });

  it("a Show lists Episodes from the Manifest under that known Show key", async () => {
    const library = createLibrary({
      storage: memoryStorage(),
      http: memoryHttp({
        friends: [
          {
            episodeId: "friends-s01e01",
            title: "The One Where Monica Gets a Roommate",
            sortKey: "S01E01",
            source: "https://cdn.example/friends-s01e01.mp4",
          },
        ],
      }),
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();

    const show = await library.viewShow("friends");
    assert.equal(show.title, "Friends");
    assert.equal(show.episodes.length, 1);
    assert.equal(show.episodes[0].episodeId, "friends-s01e01");
    assert.equal(
      show.episodes[0].title,
      "The One Where Monica Gets a Roommate",
    );
  });

  it("unknown Show keys in the Manifest are ignored", async () => {
    const library = createLibrary({
      storage: memoryStorage(),
      http: memoryHttp({
        "made-up-show": [
          {
            episodeId: "invented",
            title: "Should not appear",
            sortKey: "001",
            source: "https://cdn.example/nope.mp4",
          },
        ],
        "yakka-dee": [
          {
            episodeId: "yakka-dee-apple",
            title: "Apple",
            sortKey: "001",
            source: "https://cdn.example/yakka-dee-apple.mp4",
          },
        ],
      }),
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    const view = await library.viewLibrary();

    assert.deepEqual(
      view.stages.map((stage) => stage.stageId),
      ["beginner", "intermediate", "advanced", "ultimate"],
    );
    const beginner = await library.viewStage("beginner");
    assert.deepEqual(
      beginner.shows.map((show) => show.showKey),
      ["yakka-dee", "cocomelon"],
    );

    const invented = await library.viewShow("made-up-show");
    assert.deepEqual(invented.episodes, []);
    assert.equal(invented.title, "");

    const yakka = await library.viewShow("yakka-dee");
    assert.equal(yakka.episodes[0].episodeId, "yakka-dee-apple");
  });

  it("a Show lists Episodes ordered by sort key", async () => {
    const library = createLibrary({
      storage: memoryStorage(),
      http: memoryHttp({
        friends: [
          {
            episodeId: "friends-s01e02",
            title: "The One with the Sonogram at the End",
            sortKey: "S01E02",
            source: "https://cdn.example/friends-s01e02.mp4",
          },
          {
            episodeId: "friends-s01e01",
            title: "The One Where Monica Gets a Roommate",
            sortKey: "S01E01",
            source: "https://cdn.example/friends-s01e01.mp4",
          },
        ],
      }),
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();

    const show = await library.viewShow("friends");
    assert.deepEqual(
      show.episodes.map((episode) => episode.episodeId),
      ["friends-s01e01", "friends-s01e02"],
    );
    assert.deepEqual(
      show.episodes.map((episode) => episode.title),
      [
        "The One Where Monica Gets a Roommate",
        "The One with the Sonogram at the End",
      ],
    );
  });

  it("last successful Manifest is kept so a later Library can still browse", async () => {
    const storage = memoryStorage();
    const library = createLibrary({
      storage,
      http: memoryHttp({
        "yakka-dee": [
          {
            episodeId: "yakka-dee-apple",
            title: "Apple",
            sortKey: "001",
            source: "https://cdn.example/yakka-dee-apple.mp4",
          },
        ],
      }),
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();

    const relaunched = createLibrary({
      storage,
      http: {
        async getJson() {
          throw new Error("offline");
        },
      },
    });
    const view = await relaunched.viewLibrary();
    assert.equal(view.empty, false);

    const show = await relaunched.viewShow("yakka-dee");
    assert.equal(show.episodes[0].episodeId, "yakka-dee-apple");
    assert.equal(show.episodes[0].title, "Apple");
  });

  it("刷新 fetches the Manifest again so new Episodes appear", async () => {
    const http = memoryHttp({ friends: [] });
    const library = createLibrary({
      storage: memoryStorage(),
      http,
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();
    assert.deepEqual((await library.viewShow("friends")).episodes, []);

    http.setBody({
      friends: [
        {
          episodeId: "friends-s01e01",
          title: "The One Where Monica Gets a Roommate",
          sortKey: "S01E01",
          source: "https://cdn.example/friends-s01e01.mp4",
        },
      ],
    });
    await library.refresh();

    const show = await library.viewShow("friends");
    assert.equal(show.episodes[0].episodeId, "friends-s01e01");
    assert.equal(
      show.episodes[0].title,
      "The One Where Monica Gets a Roommate",
    );
  });

  it("Episode identity is EpisodeId when Source or sort key change", async () => {
    const http = memoryHttp({
      friends: [
        {
          episodeId: "friends-s01e01",
          title: "The One Where Monica Gets a Roommate",
          sortKey: "S01E01",
          source: "https://cdn.example/friends-s01e01-v1.mp4",
        },
      ],
    });
    const library = createLibrary({
      storage: memoryStorage(),
      http,
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();

    http.setBody({
      friends: [
        {
          episodeId: "friends-s01e01",
          title: "The One Where Monica Gets a Roommate",
          sortKey: "S01E01b",
          source: "https://cdn.example/friends-s01e01-v2.mp4",
        },
      ],
    });
    await library.refresh();

    const show = await library.viewShow("friends");
    assert.equal(show.episodes.length, 1);
    assert.equal(show.episodes[0].episodeId, "friends-s01e01");
    assert.equal(show.episodes[0].sortKey, "S01E01b");
    assert.equal(
      show.episodes[0].source,
      "https://cdn.example/friends-s01e01-v2.mp4",
    );
  });

  it("fetch uses the Learner-configured Manifest URL", async () => {
    const http = {
      async getJson(url) {
        const manifests = {
          "https://example.com/manifest.json": {
            "yakka-dee": [
              {
                episodeId: "from-configured-url",
                title: "Apple",
                sortKey: "001",
                source: "https://cdn.example/apple.mp4",
              },
            ],
          },
          "https://other.example/manifest.json": {
            "yakka-dee": [
              {
                episodeId: "from-other-url",
                title: "Other",
                sortKey: "001",
                source: "https://cdn.example/other.mp4",
              },
            ],
          },
        };
        return manifests[url];
      },
    };
    const library = createLibrary({
      storage: memoryStorage(),
      http,
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();

    const show = await library.viewShow("yakka-dee");
    assert.equal(show.episodes[0].episodeId, "from-configured-url");
  });

  it("刷新 fetches the Manifest so a known Show lists its Episodes", async () => {
    const http = memoryHttp({
      "yakka-dee": [
        {
          episodeId: "yakka-dee-apple",
          title: "Apple",
          sortKey: "001",
          source: "https://cdn.example/yakka-dee-apple.mp4",
        },
      ],
    });
    const library = createLibrary({
      storage: memoryStorage(),
      http,
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();

    const show = await library.viewShow("yakka-dee");
    assert.equal(show.title, "Yakka Dee");
    assert.equal(show.episodes.length, 1);
    assert.equal(show.episodes[0].episodeId, "yakka-dee-apple");
    assert.equal(show.episodes[0].title, "Apple");
    assert.equal(show.episodes[0].sortKey, "001");
    assert.equal(
      show.episodes[0].source,
      "https://cdn.example/yakka-dee-apple.mp4",
    );
  });

  it("继续看 is empty in-progress when nothing is underway", async () => {
    const library = createLibrary({ storage: memoryStorage() });
    const view = await library.viewInProgress();

    assert.equal(view.empty, true);
    assert.deepEqual(view.episodes, []);
    assert.equal(view.copy, "还没有看到一半的 Episode。");
  });
});
