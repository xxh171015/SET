const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createLibrary } = require("../miniprogram/library");

function memoryStorage(initialManifestUrl = "") {
  let manifestUrl = initialManifestUrl;
  let lastManifest = null;
  let watchProgress = {};
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
    async getWatchProgress() {
      return watchProgress;
    },
    async setWatchProgress(next) {
      watchProgress = next;
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

function memoryVideo() {
  let src = "";
  let playbackRate = 1;
  return {
    async load(source) {
      src = source;
    },
    async setPlaybackRate(rate) {
      playbackRate = rate;
    },
    get src() {
      return src;
    },
    get playbackRate() {
      return playbackRate;
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

  it("opening an Episode plays that Episode's HTTPS Source", async () => {
    const video = memoryVideo();
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
      video,
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();

    const view = await library.viewEpisode("yakka-dee-apple");

    assert.equal(view.source, "https://cdn.example/yakka-dee-apple.mp4");
    assert.equal(video.src, "https://cdn.example/yakka-dee-apple.mp4");
  });

  it("opening an Episode starts at 1x with rates 0.75 through 2", async () => {
    const video = memoryVideo();
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
      video,
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();

    const view = await library.viewEpisode("yakka-dee-apple");

    assert.equal(view.playbackRate, 1);
    assert.deepEqual(view.rates, [0.75, 1, 1.25, 1.5, 2]);
    assert.equal(video.playbackRate, 1);
  });

  it("Learner can set playback rate to 1.5", async () => {
    const video = memoryVideo();
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
      video,
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();
    await library.viewEpisode("yakka-dee-apple");

    const view = await library.setPlaybackRate(1.5);

    assert.equal(view.playbackRate, 1.5);
    assert.equal(video.playbackRate, 1.5);
  });

  it("playback rate is not persisted across a new Library", async () => {
    const storage = memoryStorage();
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
      storage,
      http,
      video: memoryVideo(),
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();
    await library.viewEpisode("yakka-dee-apple");
    await library.setPlaybackRate(2);

    const relaunched = createLibrary({
      storage,
      http,
      video: memoryVideo(),
    });
    const view = await relaunched.viewEpisode("yakka-dee-apple");

    assert.equal(view.playbackRate, 1);
  });

  it("keeps the current playback rate when the requested rate is not listed", async () => {
    const video = memoryVideo();
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
      video,
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();
    await library.viewEpisode("yakka-dee-apple");
    await library.setPlaybackRate(1.5);

    const view = await library.setPlaybackRate(3);

    assert.equal(view.playbackRate, 1.5);
    assert.equal(video.playbackRate, 1.5);
  });

  it("player view uses the Episode title", async () => {
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

    const view = await library.viewEpisode("friends-s01e01");

    assert.equal(view.title, "The One Where Monica Gets a Roommate");
  });

  it("leaving the player writes WatchProgress so resume uses positionSeconds", async () => {
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
    await library.viewEpisode("yakka-dee-apple");

    await library.leaveEpisode("yakka-dee-apple", {
      positionSeconds: 42,
      durationSeconds: 120,
    });

    const view = await library.viewEpisode("yakka-dee-apple");
    assert.equal(view.positionSeconds, 42);
  });

  it("WatchProgress persists on this install keyed by EpisodeId", async () => {
    const storage = memoryStorage();
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
    const library = createLibrary({ storage, http });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();
    await library.leaveEpisode("yakka-dee-apple", {
      positionSeconds: 42,
      durationSeconds: 120,
    });

    const relaunched = createLibrary({ storage, http });
    const view = await relaunched.viewEpisode("yakka-dee-apple");
    assert.equal(view.positionSeconds, 42);
  });

  it("继续看 lists unfinished Episodes with positionSeconds greater than 0", async () => {
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
    await library.leaveEpisode("yakka-dee-apple", {
      positionSeconds: 42,
      durationSeconds: 120,
    });

    const view = await library.viewInProgress();
    assert.equal(view.empty, false);
    assert.equal(view.episodes.length, 1);
    assert.equal(view.episodes[0].episodeId, "yakka-dee-apple");
    assert.equal(view.episodes[0].title, "Apple");
  });

  it("remaining under 5 seconds marks completed, keeps the row, and drops it from 继续看", async () => {
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
    await library.leaveEpisode("yakka-dee-apple", {
      positionSeconds: 116,
      durationSeconds: 120,
    });

    const inProgress = await library.viewInProgress();
    assert.equal(inProgress.empty, true);
    assert.deepEqual(inProgress.episodes, []);

    const show = await library.viewShow("yakka-dee");
    assert.equal(show.episodes[0].episodeId, "yakka-dee-apple");
    assert.equal(show.episodes[0].completed, true);
  });

  it("a completed Episode opens at 0", async () => {
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
    await library.leaveEpisode("yakka-dee-apple", {
      positionSeconds: 118,
      durationSeconds: 120,
    });

    const view = await library.viewEpisode("yakka-dee-apple");
    assert.equal(view.positionSeconds, 0);
  });

  it("watching into the middle of a completed Episode returns it to 继续看", async () => {
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
    await library.leaveEpisode("yakka-dee-apple", {
      positionSeconds: 118,
      durationSeconds: 120,
    });
    await library.leaveEpisode("yakka-dee-apple", {
      positionSeconds: 30,
      durationSeconds: 120,
    });

    const inProgress = await library.viewInProgress();
    assert.equal(inProgress.empty, false);
    assert.equal(inProgress.episodes[0].episodeId, "yakka-dee-apple");

    const show = await library.viewShow("yakka-dee");
    assert.equal(show.episodes[0].completed, false);

    const view = await library.viewEpisode("yakka-dee-apple");
    assert.equal(view.positionSeconds, 30);
  });

  it("play updates lastPlayedAt and does not store playback rate", async () => {
    const storage = memoryStorage();
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
      storage,
      http,
      clock: { now: () => "2026-03-15T08:00:00.000Z" },
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();
    await library.viewEpisode("yakka-dee-apple");
    await library.setPlaybackRate(1.5);
    await library.playEpisode("yakka-dee-apple");

    const show = await library.viewShow("yakka-dee");
    assert.equal(show.episodes[0].lastPlayedAt, "2026-03-15T08:00:00.000Z");

    const relaunched = createLibrary({ storage, http });
    const view = await relaunched.viewEpisode("yakka-dee-apple");
    assert.equal(view.playbackRate, 1);
  });

  it("WatchProgress stays on EpisodeId when Source changes", async () => {
    const http = memoryHttp({
      "yakka-dee": [
        {
          episodeId: "yakka-dee-apple",
          title: "Apple",
          sortKey: "001",
          source: "https://cdn.example/yakka-dee-apple-v1.mp4",
        },
      ],
    });
    const library = createLibrary({
      storage: memoryStorage(),
      http,
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();
    await library.leaveEpisode("yakka-dee-apple", {
      positionSeconds: 42,
      durationSeconds: 120,
    });

    http.setBody({
      "yakka-dee": [
        {
          episodeId: "yakka-dee-apple",
          title: "Apple",
          sortKey: "001",
          source: "https://cdn.example/yakka-dee-apple-v2.mp4",
        },
      ],
    });
    await library.refresh();

    const view = await library.viewEpisode("yakka-dee-apple");
    assert.equal(view.positionSeconds, 42);
    assert.equal(view.source, "https://cdn.example/yakka-dee-apple-v2.mp4");
  });

  it("leaving the player writes lastPlayedAt on WatchProgress", async () => {
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
      clock: { now: () => "2026-04-01T12:00:00.000Z" },
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();
    await library.leaveEpisode("yakka-dee-apple", {
      positionSeconds: 42,
      durationSeconds: 120,
    });

    const show = await library.viewShow("yakka-dee");
    assert.equal(show.episodes[0].lastPlayedAt, "2026-04-01T12:00:00.000Z");
  });

  it("继续看 lists in-progress Episodes most recently played first", async () => {
    let now = "2026-03-15T08:00:00.000Z";
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
        friends: [
          {
            episodeId: "friends-s01e01",
            title: "The One Where Monica Gets a Roommate",
            sortKey: "S01E01",
            source: "https://cdn.example/friends-s01e01.mp4",
          },
        ],
      }),
      clock: { now: () => now },
    });
    await library.saveManifestUrl("https://example.com/manifest.json");
    await library.refresh();
    await library.leaveEpisode("yakka-dee-apple", {
      positionSeconds: 10,
      durationSeconds: 120,
    });
    now = "2026-03-15T09:00:00.000Z";
    await library.leaveEpisode("friends-s01e01", {
      positionSeconds: 20,
      durationSeconds: 1200,
    });

    const view = await library.viewInProgress();
    assert.deepEqual(
      view.episodes.map((episode) => episode.episodeId),
      ["friends-s01e01", "yakka-dee-apple"],
    );
  });

  it("leaving before duration is known does not mark the Episode completed", async () => {
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
    await library.leaveEpisode("yakka-dee-apple", {
      positionSeconds: 0,
      durationSeconds: 0,
    });

    const show = await library.viewShow("yakka-dee");
    assert.equal(show.episodes[0].completed, false);
    const inProgress = await library.viewInProgress();
    assert.equal(inProgress.empty, true);
  });

  it("leaving a completed Episode at 0 keeps it completed", async () => {
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
    await library.leaveEpisode("yakka-dee-apple", {
      positionSeconds: 118,
      durationSeconds: 120,
    });
    await library.leaveEpisode("yakka-dee-apple", {
      positionSeconds: 0,
      durationSeconds: 120,
    });

    const show = await library.viewShow("yakka-dee");
    assert.equal(show.episodes[0].completed, true);
    const inProgress = await library.viewInProgress();
    assert.equal(inProgress.empty, true);
  });
});
