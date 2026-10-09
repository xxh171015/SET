const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];

const STAGES = [
  { stageId: "beginner", name: "初级", showKeys: ["yakka-dee", "cocomelon"] },
  { stageId: "intermediate", name: "中级", showKeys: ["peter-rabbit"] },
  { stageId: "advanced", name: "高级", showKeys: ["bojack"] },
  {
    stageId: "ultimate",
    name: "终级",
    showKeys: ["tbbt", "friends", "two-broke-girls"],
  },
];

const SHOWS = {
  "yakka-dee": { title: "Yakka Dee" },
  cocomelon: { title: "CoComelon" },
  "peter-rabbit": { title: "Peter Rabbit" },
  bojack: { title: "BoJack Horseman" },
  tbbt: { title: "The Big Bang Theory" },
  friends: { title: "Friends" },
  "two-broke-girls": { title: "2 Broke Girls" },
};

function episodesFromManifest(body) {
  const episodesByShow = {};
  Object.keys(SHOWS).forEach((showKey) => {
    const raw = body && body[showKey];
    episodesByShow[showKey] = Array.isArray(raw)
      ? raw
          .map((episode) => ({
            episodeId: episode.episodeId,
            title: episode.title,
            sortKey: episode.sortKey,
            source: episode.source,
          }))
          .sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)))
      : [];
  });
  return episodesByShow;
}

function createLibrary({ storage, http, video }) {
  let episodesByShow = {};
  let fetchedManifest = false;
  let playbackRate = 1;

  function applyManifest(body) {
    fetchedManifest = true;
    episodesByShow = episodesFromManifest(body);
  }

  return {
    async viewLibrary() {
      const manifestUrl = ((await storage.getManifestUrl()) || "").trim();
      if (!manifestUrl) {
        return {
          empty: true,
          episodes: [],
          primaryAction: "goToSettings",
          actionLabel: "去设置",
        };
      }
      await this.refresh();
      if (!fetchedManifest) {
        return {
          empty: true,
          episodes: [],
          primaryAction: null,
          actionLabel: null,
        };
      }
      return {
        empty: false,
        episodes: [],
        primaryAction: null,
        actionLabel: null,
        continueBanner: false,
        stages: STAGES.map((stage) => ({
          stageId: stage.stageId,
          name: stage.name,
          showTitles: stage.showKeys.map((showKey) => SHOWS[showKey].title),
        })),
      };
    },

    async viewSettings() {
      const manifestUrl = (await storage.getManifestUrl()) || "";
      return { manifestUrl };
    },

    async saveManifestUrl(url) {
      await storage.setManifestUrl(String(url ?? "").trim());
      fetchedManifest = false;
      episodesByShow = {};
      if (storage.setLastManifest) {
        await storage.setLastManifest(null);
      }
    },

    async refresh() {
      const manifestUrl = ((await storage.getManifestUrl()) || "").trim();
      if (!manifestUrl) {
        return;
      }
      if (http) {
        try {
          const body = await http.getJson(manifestUrl);
          applyManifest(body);
          if (storage.setLastManifest) {
            await storage.setLastManifest(body);
          }
          return;
        } catch (_err) {
          // Keep last successful Manifest for browse; failure chrome is a later ticket.
        }
      }
      const last =
        storage.getLastManifest ? await storage.getLastManifest() : null;
      if (last) {
        applyManifest(last);
      }
    },

    async viewStage(stageId) {
      const stage = STAGES.find((item) => item.stageId === stageId);
      return {
        name: stage ? stage.name : "",
        shows: stage
          ? stage.showKeys.map((showKey) => ({
              showKey,
              title: SHOWS[showKey].title,
            }))
          : [],
      };
    },

    async viewShow(showKey) {
      if (!fetchedManifest) {
        await this.refresh();
      }
      const show = SHOWS[showKey];
      return {
        title: show ? show.title : "",
        episodes: episodesByShow[showKey] || [],
      };
    },

    async viewInProgress() {
      return {
        empty: true,
        episodes: [],
        copy: "还没有看到一半的 Episode。",
      };
    },

    async viewEpisode(episodeId) {
      if (!fetchedManifest) {
        await this.refresh();
      }
      let episode = null;
      Object.keys(SHOWS).forEach((showKey) => {
        if (episode) {
          return;
        }
        episode = (episodesByShow[showKey] || []).find(
          (item) => item.episodeId === episodeId,
        );
      });
      const source = episode ? episode.source : "";
      playbackRate = 1;
      if (video && video.load) {
        await video.load(source);
      }
      if (video && video.setPlaybackRate) {
        await video.setPlaybackRate(playbackRate);
      }
      return {
        title: episode ? episode.title : "",
        source,
        playbackRate,
        rates: PLAYBACK_RATES,
      };
    },

    async setPlaybackRate(rate) {
      if (PLAYBACK_RATES.includes(rate)) {
        playbackRate = rate;
        if (video && video.setPlaybackRate) {
          await video.setPlaybackRate(playbackRate);
        }
      }
      return { playbackRate };
    },
  };
}

module.exports = { createLibrary };
