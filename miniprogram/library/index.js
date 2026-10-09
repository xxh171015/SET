const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];
const SOURCE_FAIL_COPY = "无法播放。请检查 Source 地址。SET 不托管视频。";
const SOURCE_FAIL_ACTION = "返回";

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

function episodeRow(episode, progress) {
  const row = {
    ...episode,
    completed: Boolean(progress && progress.completed),
    lastPlayedAt: progress ? progress.lastPlayedAt || null : null,
  };
  if (progress) {
    row.positionSeconds = progress.positionSeconds;
    if (progress.durationSeconds > 0) {
      row.durationSeconds = progress.durationSeconds;
    }
  }
  return row;
}

function findEpisodeById(episodesByShow, episodeId) {
  const showKeys = Object.keys(SHOWS);
  for (let i = 0; i < showKeys.length; i += 1) {
    const episode = (episodesByShow[showKeys[i]] || []).find(
      (item) => item.episodeId === episodeId,
    );
    if (episode) {
      return episode;
    }
  }
  return null;
}

function sourceFailView(episode, extras) {
  return {
    title: episode ? episode.title : "",
    source: episode ? episode.source : "",
    playbackRate: extras.playbackRate,
    rates: PLAYBACK_RATES,
    playbackFailed: true,
    copy: SOURCE_FAIL_COPY,
    actionLabel: SOURCE_FAIL_ACTION,
    ...extras.fields,
  };
}

function episodesFromManifest(body) {
  const seenEpisodeIds = new Set();
  const episodesByShow = {};
  Object.keys(SHOWS).forEach((showKey) => {
    const raw = body && body[showKey];
    const episodes = [];
    if (Array.isArray(raw)) {
      raw.forEach((episode) => {
        if (!episode || seenEpisodeIds.has(episode.episodeId)) {
          return;
        }
        seenEpisodeIds.add(episode.episodeId);
        episodes.push({
          episodeId: episode.episodeId,
          title: episode.title,
          sortKey: episode.sortKey,
          source: episode.source,
        });
      });
      episodes.sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));
    }
    episodesByShow[showKey] = episodes;
  });
  return episodesByShow;
}

function createLibrary({ storage, http, video, clock }) {
  let episodesByShow = {};
  let fetchedManifest = false;
  let manifestStale = false;
  let playbackRate = 1;
  const progressBeforePlay = new Map();
  const playbackFailed = new Set();

  async function loadWatchProgress() {
    return (await storage.getWatchProgress()) || {};
  }

  async function saveWatchProgress(watchProgressByEpisodeId) {
    await storage.setWatchProgress(watchProgressByEpisodeId);
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
      const manifestUrl = String(url ?? "").trim();
      await storage.setManifestUrl(manifestUrl);
      fetchedManifest = false;
      manifestStale = false;
      episodesByShow = {};
      if (!manifestUrl && storage.setLastManifest) {
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
      const watchProgressByEpisodeId = await loadWatchProgress();
      return {
        title: show ? show.title : "",
        episodes: (episodesByShow[showKey] || []).map((episode) =>
          episodeRow(episode, watchProgressByEpisodeId[episode.episodeId]),
        ),
      };
    },

    async viewInProgress() {
      if (!fetchedManifest) {
        await this.refresh();
      }
      const watchProgressByEpisodeId = await loadWatchProgress();
      const episodes = [];
      Object.keys(watchProgressByEpisodeId).forEach((episodeId) => {
        const progress = watchProgressByEpisodeId[episodeId];
        if (
          !(progress && progress.completed !== true && progress.positionSeconds > 0)
        ) {
          return;
        }
        const episode = findEpisodeById(episodesByShow, episodeId);
        if (!episode) {
          return;
        }
        episodes.push(
          episodeRow(
            {
              episodeId: episode.episodeId,
              title: episode.title,
            },
            progress,
          ),
        );
      });
      episodes.sort((a, b) =>
        String(b.lastPlayedAt || "").localeCompare(String(a.lastPlayedAt || "")),
      );
      if (episodes.length === 0) {
        return {
          empty: true,
          episodes: [],
          copy: "还没有看到一半的 Episode。去片库看看。",
          primaryAction: "goToLibrary",
          actionLabel: "去片库",
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
      const episode = findEpisodeById(episodesByShow, episodeId);
      const source = episode ? episode.source : "";
      playbackRate = 1;
      playbackFailed.delete(episodeId);
      const progress = (await loadWatchProgress())[episodeId];
      const positionSeconds =
        !progress || progress.completed ? 0 : progress.positionSeconds;
      if (video && video.load) {
        try {
          await video.load(source);
        } catch (_err) {
          playbackFailed.add(episodeId);
          return sourceFailView(episode, {
            playbackRate,
            fields: { positionSeconds },
          });
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
      playbackFailed.add(episodeId);
      if (progressBeforePlay.has(episodeId)) {
        const watchProgressByEpisodeId = { ...(await loadWatchProgress()) };
        const previous = progressBeforePlay.get(episodeId);
        if (previous == null) {
          delete watchProgressByEpisodeId[episodeId];
        } else {
          watchProgressByEpisodeId[episodeId] = previous;
        }
        await saveWatchProgress(watchProgressByEpisodeId);
        progressBeforePlay.delete(episodeId);
      }
      const episode = findEpisodeById(episodesByShow, episodeId);
      return sourceFailView(episode, { playbackRate, fields: {} });
    },

    async playEpisode(episodeId) {
      if (playbackFailed.has(episodeId)) {
        return;
      }
      const watchProgressByEpisodeId = { ...(await loadWatchProgress()) };
      if (!progressBeforePlay.has(episodeId)) {
        progressBeforePlay.set(episodeId, watchProgressByEpisodeId[episodeId]);
      }
      const previous = watchProgressByEpisodeId[episodeId] || {};
      watchProgressByEpisodeId[episodeId] = {
        ...previous,
        positionSeconds: previous.positionSeconds || 0,
        completed: Boolean(previous.completed),
        lastPlayedAt: nowIso(),
      };
      await saveWatchProgress(watchProgressByEpisodeId);
    },

    async leaveEpisode(episodeId, { positionSeconds, durationSeconds } = {}) {
      if (playbackFailed.has(episodeId)) {
        return;
      }
      const watchProgressByEpisodeId = { ...(await loadWatchProgress()) };
      const previous = watchProgressByEpisodeId[episodeId];
      let completed = Boolean(previous && previous.completed);
      if (durationSeconds != null && durationSeconds > 0) {
        if (durationSeconds - positionSeconds < 5) {
          completed = true;
        } else if (positionSeconds > 0) {
          completed = false;
        }
      }
      watchProgressByEpisodeId[episodeId] = {
        ...(previous || {}),
        positionSeconds,
        completed,
        ...(durationSeconds > 0 ? { durationSeconds } : {}),
      };
      progressBeforePlay.delete(episodeId);
      await saveWatchProgress(watchProgressByEpisodeId);
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
