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

function isManifestBody(body) {
  return body != null && typeof body === "object" && !Array.isArray(body);
}

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

function createLibrary({ storage, http, video, clock }) {
  let episodesByShow = {};
  let fetchedManifest = false;
  let manifestStale = false;
  let playbackRate = 1;

  async function loadWatchProgress() {
    if (!storage.getWatchProgress) {
      return {};
    }
    return (await storage.getWatchProgress()) || {};
  }

  async function saveWatchProgress(all) {
    if (storage.setWatchProgress) {
      await storage.setWatchProgress(all);
    }
  }

  function nowIso() {
    if (clock && clock.now) {
      return clock.now();
    }
    return new Date().toISOString();
  }

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
          stale: false,
          copy: "无法获取 Manifest。",
          episodes: [],
          primaryAction: null,
          actionLabel: "去设置",
          refreshLabel: "刷新",
        };
      }
      return {
        empty: false,
        stale: manifestStale,
        copy: manifestStale
          ? "当前显示的是上次成功获取的 Manifest，可能不是最新。"
          : null,
        refreshLabel: manifestStale ? "刷新" : null,
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
      manifestStale = false;
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
          if (!isManifestBody(body)) {
            throw new Error("bad Manifest JSON");
          }
          applyManifest(body);
          manifestStale = false;
          if (storage.setLastManifest) {
            await storage.setLastManifest(body);
          }
          return;
        } catch (_err) {
          // Keep last successful Manifest and mark it stale.
        }
      }
      const last =
        storage.getLastManifest ? await storage.getLastManifest() : null;
      if (last) {
        applyManifest(last);
        manifestStale = true;
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
      const all = await loadWatchProgress();
      return {
        title: show ? show.title : "",
        episodes: (episodesByShow[showKey] || []).map((episode) => {
          const progress = all[episode.episodeId];
          return {
            ...episode,
            completed: Boolean(progress && progress.completed),
            lastPlayedAt: progress ? progress.lastPlayedAt || null : null,
          };
        }),
      };
    },

    async viewInProgress() {
      if (!fetchedManifest) {
        await this.refresh();
      }
      const all = await loadWatchProgress();
      const episodes = [];
      Object.keys(all).forEach((episodeId) => {
        const progress = all[episodeId];
        if (
          !(progress && progress.completed !== true && progress.positionSeconds > 0)
        ) {
          return;
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
        if (!episode) {
          return;
        }
        episodes.push({
          episodeId: episode.episodeId,
          title: episode.title,
          lastPlayedAt: progress.lastPlayedAt || null,
        });
      });
      episodes.sort((a, b) =>
        String(b.lastPlayedAt || "").localeCompare(String(a.lastPlayedAt || "")),
      );
      if (episodes.length === 0) {
        return {
          empty: true,
          episodes: [],
          copy: "还没有看到一半的 Episode。",
        };
      }
      return {
        empty: false,
        episodes,
        copy: null,
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
      const progress = (await loadWatchProgress())[episodeId];
      const positionSeconds =
        !progress || progress.completed ? 0 : progress.positionSeconds;
      if (video && video.load) {
        try {
          await video.load(source);
        } catch (_err) {
          return {
            title: episode ? episode.title : "",
            source,
            playbackRate,
            rates: PLAYBACK_RATES,
            positionSeconds,
            playbackFailed: true,
            copy: "无法播放。请检查 Source 地址。SET 不托管视频。",
            actionLabel: "返回",
          };
        }
      }
      if (video && video.setPlaybackRate) {
        await video.setPlaybackRate(playbackRate);
      }
      return {
        title: episode ? episode.title : "",
        source,
        playbackRate,
        rates: PLAYBACK_RATES,
        positionSeconds,
      };
    },

    async sourceFailed(episodeId) {
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
      return {
        title: episode ? episode.title : "",
        source: episode ? episode.source : "",
        playbackRate,
        rates: PLAYBACK_RATES,
        playbackFailed: true,
        copy: "无法播放。请检查 Source 地址。SET 不托管视频。",
        actionLabel: "返回",
      };
    },

    async playEpisode(episodeId) {
      const all = { ...(await loadWatchProgress()) };
      const previous = all[episodeId] || {};
      all[episodeId] = {
        ...previous,
        positionSeconds: previous.positionSeconds || 0,
        completed: Boolean(previous.completed),
        lastPlayedAt: nowIso(),
      };
      await saveWatchProgress(all);
    },

    async leaveEpisode(episodeId, { positionSeconds, durationSeconds } = {}) {
      const all = { ...(await loadWatchProgress()) };
      const previous = all[episodeId];
      let completed = Boolean(previous && previous.completed);
      if (durationSeconds != null && durationSeconds > 0) {
        if (durationSeconds - positionSeconds < 5) {
          completed = true;
        } else if (positionSeconds > 0) {
          completed = false;
        }
      }
      all[episodeId] = {
        ...(previous || {}),
        positionSeconds,
        completed,
        lastPlayedAt: nowIso(),
      };
      await saveWatchProgress(all);
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
