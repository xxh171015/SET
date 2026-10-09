# Spoken English Training

SET is a WeChat mini program for one Learner. v1 is a graded Library of Learner-supplied shows, not a speaking tutor.

## Language

**Learner**:
The person who trains with SET. v1 has exactly one Learner.
_Avoid_: User, 用户, Customer

**Library**:
The graded collection of Shows the Learner trains with. SET v1 _is_ this Library.
_Avoid_: 片库, catalog, video store, player (the player is a surface on the Library, not the Library)

**Manifest**:
The one Learner-authored document SET fetches that lists Episodes (EpisodeId, title, sort key, Source) under already-known Shows. It does not define Stages or Shows. SET fetches it from a Learner-configured URL. When a fetch fails, SET may still show the last successfully fetched Manifest.
_Avoid_: catalog, Library (as a name for this file), in-app episode form

**Stage**:
A difficulty band in the Library. v1 has four, in order: Beginner (初级), Intermediate (中级), Advanced (高级), Ultimate (终级).
_Avoid_: level, grade, 等级

**Show**:
A titled series that belongs to exactly one Stage. v1's set is fixed: Yakka Dee, CoComelon, Peter Rabbit, BoJack Horseman, The Big Bang Theory, Friends, 2 Broke Girls. A Show holds a flat ordered list of Episodes.
_Avoid_: 美剧, series (unqualified), title, 剧, Season

**Episode**:
One watchable unit of a Show. Each Episode has a title, a sort key within its Show, and exactly one Source. v1 has no Season; season-like numbering lives in the title or sort key when a Show has it.
_Avoid_: Season, 季, clip, 视频文件, 一集 (as the English name)

**EpisodeId**:
The stable identity of an Episode, unique in the Library. WatchProgress attaches to EpisodeId. Changing Source or sort key does not change it.
_Avoid_: URL, filename, sort key (as identity)

**WatchProgress**:
The Learner's playback record for one Episode: position in seconds, lastPlayedAt, and whether it is completed. It lives only in this WeChat install. Remaining under five seconds counts as completed; the row stays (for the checkmark and date) but leaves 继续看. It is not playback rate.
_Avoid_: history, bookmark, save point

**Source**:
The Learner-controlled playback URL for an Episode. SET stores that URL and does not store video bytes, mint the URL, sign it at play time, or hold origin credentials. An Episode has exactly one Source.
_Avoid_: local file, LAN path, hosted video, CDN, signed play-time URL, WeChat cloud file (as v1 Source), 本地文件 (when meaning a file inside WeChat)
