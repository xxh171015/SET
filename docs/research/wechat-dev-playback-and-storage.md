# WeChat 开发版 playback and storage constraints

Research for [WeChat 开发版 playback and storage constraints](https://github.com/xxh171015/SET/issues/3).  
Sources: WeChat official docs on developers.weixin.qq.com (fetched 2026-10-09). Community posts are not used as authority.

## Short answer

SET v1 can treat a Source as a `video` `src` (network path, local temp path, or cloud file ID) and keep Library metadata plus resume position in WeChat client storage (`wx.setStorage` / `wx.setStorageSync`: 1MB per key, 10MB total). It cannot persist episode bytes in the mini program: local cache + `USER_DATA_PATH` share a 200MB cap (the `saveFile` error table also says a 100MB file-storage ceiling), and `wx.downloadFile` allows 200MB per download, HTTPS GET, default 60s timeout.

开发版/体验版 does **not** skip 合法域名 by existing. Skip is a DevTools checkbox, and on a phone it applies only with 打开调试. LAN HTTP without whitelist is documented for `wx.request` / `wx.downloadFile` / `wx.uploadFile` / `wx.connectSocket` to a same-subnet, non-本机 IP — **not** named for the `video` component. Official docs are silent on a max size for streamed `video` playback, silent on whether `video` `src` must be on downloadFile 合法域名, and silent on whether `video` `src` to `http://LAN-IP/...` gets the LAN exemption.

---

## 1. 开发版 / 体验版 is not a domain-check exemption

[小程序协同工作和发布](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/release.html): 开发版本 is each developer's uploaded code; 体验版本 is one chosen 开发版本; 线上版本 is the published build. 预览 packs current code and shows a QR for the developer's WeChat. 上传 is what can become 体验版 or go to review. SET v1 staying unpublished means 开发版/体验版/预览, not 线上版本.

[网络 · 跳过域名校验](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html): in DevTools, temporarily enable 「开发环境不校验请求域名、TLS 版本及 HTTPS 证书」. Then “在微信开发者工具中及手机开启调试模式时，不会进行服务器域名的校验.” The same page: if the phone works only with 打开调试 and fails without it, the skip is in effect and the configured domain/certificate is not actually valid for a non-debug run.

[申请测试号](https://developers.weixin.qq.com/miniprogram/dev/devtools/sandbox.html): skip in 项目设置 via “不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”; on device, “点击右上角选项，选择「打开调试」”.

[基本信息](https://developers.weixin.qq.com/miniprogram/dev/devtools/project.html): that checkbox is for development; 正式发布 still checks `wx.request`, `wx.connectSocket`, `wx.downloadFile`, `wx.uploadFile`, and `web-view` 业务域名, plus TLS and certificate validity.

[vConsole](https://developers.weixin.qq.com/miniprogram/dev/framework/usability/vConsole.html): 打开调试 is the phone menu item that restarts the mini program with vConsole.

**Not stated:** that 开发版 or 体验版, by itself, skips 合法域名. A Learner-only 体验版 with debug off is still under server-domain rules.

Referrer `version` is `0` for 开发版、体验版以及审核版本, `devtools` in the tool, other values for 正式版本 ([网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html); same text on [`video` `referrer-policy`](https://developers.weixin.qq.com/miniprogram/dev/component/video.html)).

---

## 2. `video` component `src`

[`video`](https://developers.weixin.qq.com/miniprogram/dev/component/video.html): `src` is required. “要播放视频的资源地址，支持网络路径、本地临时路径、云文件ID（2.3.0）.”

Also documented on that page:

- `initial-time` (1.6.0): 指定视频初始播放位置 (unit not stated on the attribute).
- `bind:timeupdate`: `{currentTime, duration}`, every 250ms.
- `bind:seekcomplete` (2.12.0): “position iOS 单位 s, Android 单位 ms”.
- `bind:progress`: `{buffered}` percent; “只支持一段加载”.
- `is-live` (2.28.1); DRM fields from 2.19.3 (Android Widevine / iOS FairPlay).

[`VideoContext.seek`](https://developers.weixin.qq.com/miniprogram/dev/api/media/video/VideoContext.seek.html): jump to `position`, **单位 s**.

The official [`VideoContext` example](https://developers.weixin.qq.com/miniprogram/dev/api/media/video/VideoContext.html) sets `src` to an `http://wxsnsdy.tc.qq.com/...` URL. That is an example, not a protocol rule.

**Silent:** whether `src` must be HTTPS; whether a network `src` must appear on downloadFile / request 合法域名; max bitrate, duration, or file size for playback; whether a network `src` streams or buffers the whole file.

---

## 3. Formats and codecs (iOS vs Android)

Same [`video` page](https://developers.weixin.qq.com/miniprogram/dev/component/video.html):

**Containers**

| format | iOS | Android |
| --- | --- | --- |
| mp4 | yes | yes |
| mov | yes | no |
| m4v | yes | no |
| 3gp | yes | yes |
| avi | yes | no |
| m3u8 | yes | yes |
| webm | no | yes |

**Codecs**

| codec | iOS | Android |
| --- | --- | --- |
| H.264 | yes | yes |
| HEVC | yes | yes |
| MPEG-4 | yes | yes |
| VP9 | no | yes |

Both-platform Sources are mp4 / 3gp / m3u8 with H.264, HEVC, or MPEG-4.

Other iOS/Android splits on that page: `show-casting-button` (Android DLNA in 同层渲染; iOS AirPlay + DLNA; 鸿蒙 unsupported); `background-poster` “Android 独有”; DRM provision-url Android / certificate-url iOS; `seekcomplete` units as above. [`VideoContext.showStatusBar` / `hideStatusBar`](https://developers.weixin.qq.com/miniprogram/dev/api/media/video/VideoContext.html) are iOS fullscreen only.

**Silent:** profiles (Baseline/Main/High), max resolution, audio codecs (AAC etc.), fMP4 vs HLS details inside m3u8, HEVC on all device generations.

---

## 4. Domain whitelist: request vs downloadFile vs `video`

[网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html): a mini program “只可以跟指定的域名进行网络通信”, listing `wx.request`, `wx.uploadFile`, `wx.downloadFile`, `wx.connectSocket`. Configure under 小程序后台-开发-开发设置-服务器域名.

Rules on that page:

- `https` for request / uploadFile / downloadFile; `wss` for connectSocket.
- “域名不能使用 IP 地址（小程序的局域网 IP 除外）或 localhost”.
- If a port is configured, only that host:port works; if none is configured, even `:443` fails.
- Domain must be ICP-filed; no parent-domain config (use the subdomain); `api.weixin.qq.com` cannot be listed.

[域名管理](https://developers.weixin.qq.com/doc/oplatform/developers/basic_func/domain.html) §1.2: server domains cover those APIs plus TCP/UDP and DNS 预解析. “每类服务器域名最多支持配置 200 个”. Download is a **separate class** from request: the [modify-server-domain API](https://developers.weixin.qq.com/doc/oplatform/openApi/miniprogram-management/domain-management/api_modifyserverdomain.html) has `requestdomain` and `downloaddomain` (each max 200).

业务域名 is `web-view` only ([域名管理](https://developers.weixin.qq.com/doc/oplatform/developers/basic_func/domain.html) §1.1), not `video`.

After the HTTPS-certificate section, [网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html) says other HTTPS failures (explicitly “https 的图片无法加载、音视频无法播放等”) should use the same certificate checklist. That is a **certificate** note for 音视频, not a statement that `video` `src` is on the downloadFile list.

**Silent:** whether a `video` network `src` is checked against downloadFile 合法域名. The APIs that “需要事先设置通讯域名” are named as request / uploadFile / downloadFile / connectSocket; `video` is not in that list. Do not treat community answers as closing this.

---

## 5. HTTP vs HTTPS, and certificates

`wx.request` is described as “发起 HTTPS 网络请求” ([wx.request](https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html)). `wx.downloadFile` is “客户端直接发起一个 HTTPS GET 请求” ([wx.downloadFile](https://developers.weixin.qq.com/miniprogram/dev/api/network/download/wx.downloadFile.html)). [网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html): “小程序必须使用 HTTPS/WSS 发起网络请求.”

Certificate rules on that page:

- Valid, system-trusted root, name match, not expired, complete chain.
- **iOS: 不支持自签名证书**; iOS must meet Apple ATS; TLS 1.2+.
- Some old Android devices lack TLS 1.2, so the server should still speak TLS 1.2 **and below**.
- Some CAs are not trusted on some OS versions.

Skip-check (DevTools + 打开调试) skips domain, TLS version, and certificate checks in that documented pairing. Without skip, HTTP to a public hostname is outside the stated HTTPS/WSS rule for those network APIs.

`video` `src` does not restate HTTPS. The VideoContext sample uses `http://` (see §2). Whether non-LAN HTTP `video` `src` works on iOS/Android without skip is **not stated**.

---

## 6. LAN / NAS (computer on the same Wi-Fi)

[网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html): from base library 2.4.0, “网络接口允许与局域网 IP 通信，但要注意 **不允许与本机 IP 通信**.” TCP (2.18.0) “只允许与同个局域网内的非本机 IP 以及配置过的服务器域名通信.”

[局域网通信](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/mDNS.html): `wx.request` / `wx.connectSocket` / `wx.uploadFile` / `wx.downloadFile` may use `${IP}:${PORT}/${PATH}` **when and only when** that IP is on the same subnet as the phone and is not the phone’s own IP (“一般来说，就是同一局域网，如连接在同一个 wifi 下”). In that case: “不会进行安全域的校验，不要求必须使用 https/wss，也可以使用 http/ws.”

UDP (2.7.0) follows the same same-LAN, non-本机 rule. mDNS can discover LAN IPs; “iOS 微信客户端 7.0.18 及以上版本无法使用 mDNS 相关接口，安卓版本不受影响.”

[`wx.getLocalIPAddress`](https://developers.weixin.qq.com/miniprogram/dev/api/device/network/wx.getLocalIPAddress.html) (2.20.1) returns `localip` and (2.24.0) `netmask`.

A NAS/PC on the same Wi-Fi, not the phone itself, matches the documented LAN target for those four APIs, including `http://192.168.x.x:port/path`. localhost and the phone’s own IP do not.

**Silent:** whether `video` `src="http://<lan-ip>/episode.mp4"` is a “网络接口” under that exemption. The LAN page names only request / connectSocket / uploadFile / downloadFile. A documented LAN path that does not depend on that silence is: `wx.downloadFile` from the LAN IP (HTTP allowed, no 安全域), then `video` `src` = the returned local temp path — subject to the download size/timeout caps in §7.

Configuring a LAN IP in 服务器域名 is not how the exemption is written; the exemption is “when the URL is that IP form and same-subnet.” Public hostnames still cannot be IPs ([网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)).

---

## 7. `downloadFile` vs streaming; size limits

[`wx.downloadFile`](https://developers.weixin.qq.com/miniprogram/dev/api/network/download/wx.downloadFile.html):

- HTTPS GET to a local path; “单次下载允许的最大文件为 200MB”.
- Default `timeout` 60000 ms (1 minute), overridable (2.10.0).
- Without `filePath`: `tempFilePath` (temp file). With `filePath`: user-file path, same as passed in.
- Header cannot set Referer; server should send a sensible `Content-Type`.
- “使用前请注意阅读相关说明” → [网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html).

[网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html) also: `wx.request` / `wx.uploadFile` / `wx.downloadFile` max concurrent **10**; after the mini program goes to background, unfinished requests error `fail interrupted` after 5s, and network APIs cannot be called until foreground again.

There is no documented “stream via downloadFile.” Streaming, if it exists, is the `video` network `src` path. **Silent:** max size / duration of a `video` network `src`.

A TV-length file over 200MB cannot be fetched with one `wx.downloadFile`. Even under 200MB, the default 60s timeout can fire unless `timeout` (and/or `networkTimeout` in app.json, same page) is raised.

---

## 8. Local temp / cache / `USER_DATA_PATH`

[文件系统](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/file-system.html):

| kind | how it appears | persistence | size |
| --- | --- | --- | --- |
| 本地临时文件 | only via specific APIs (download, choose*, …); cannot write content directly | “仅在当前生命周期内保证有效”; after exit, if usage **> 2GB**, LRU-clean down to 2GB; runtime max **4GB**; all mini programs’ temp **> 6GB** is cleaned per mini program | 4GB runtime / 2GB after-exit target |
| 本地缓存文件 | `FileSystemManager.saveFile()` from a temp file; no custom dir/name | survives restart; cleaned when the code package is cleaned | **200MB shared** with 本地用户文件 |
| 本地用户文件 | `wx.env.USER_DATA_PATH`; free read/write from 1.7.0 | same | **200MB shared** with 本地缓存文件 |

Temp cleanup extra: “一旦小程序被关闭就可能被清理，即下次冷启动不保证可用.” Convert with `saveFile` or `copyFile` if it must survive.

Paths look like `{{协议名}}://文件路径` (`wxfile` on iOS/Android, `http` in DevTools); do not hardcode.

[`wx.env.USER_DATA_PATH`](https://developers.weixin.qq.com/miniprogram/dev/api/base/wx.env.html): “文件系统中的用户目录路径”.

[`FileSystemManager.saveFile`](https://developers.weixin.qq.com/miniprogram/dev/api/file/FileSystemManager.saveFile.html): moves the temp file (source path becomes unusable). Fail `1300202`: “存储空间不足，或文件大小超出上限（**上限100M**）.” That 100M figure disagrees with the filesystem page’s 200MB shared cap. Both are official; the docs do not reconcile them.

Mini **game** filesystem docs mention a possible raise to 1GB; the **mini program** filesystem page does not.

Read/write: only 本地用户文件 is writable; temp and cache are read-only after creation.

**Implication as a fact:** SET cannot keep a TV-episode library’s bytes in persistent mini-program storage under these caps. Temp might hold a large file during a session (runtime 4GB, after-exit 2GB target) but is not a resume-across-cold-start store, and `downloadFile` still caps a single fetch at 200MB.

---

## 9. `wx.chooseMedia` / `wx.chooseMessageFile` vs a TV-episode Library

[`wx.chooseMedia`](https://developers.weixin.qq.com/miniprogram/dev/api/media/video/wx.chooseMedia.html) (2.10.0): 拍摄或从手机相册中选择图片或视频. `sourceType`: `album` | `camera`. `count` max 9 before 2.25.0, **20** after. `maxDuration` for **camera** is 3–60s; “不限制相册.” Returns `tempFiles[].tempFilePath` (本地临时文件).

[`wx.chooseMessageFile`](https://developers.weixin.qq.com/miniprogram/dev/api/media/image/wx.chooseMessageFile.html) (2.5.0): “从客户端会话选择文件.” `count` 0–100. `type`: `all` | `video` | `image` | `file`. Returns temp paths plus `name`, `size`.

Neither API names NAS, SMB, a computer folder, or a Library catalog. They yield **temp** files from the album/camera or from WeChat sessions. Persisting those files is the 200MB / `saveFile` 100M path in §8.

**Silent:** max size of a chosen album or chat video; whether a NAS-synced folder in the iOS Files app / Android storage is visible to these pickers.

---

## 10. `wx.setStorage` / `wx.setStorageSync`

[`wx.setStorage`](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorage.html) and [`wx.setStorageSync`](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorageSync.html): write `key` → `data`. Overwrites. “除非用户主动删除或因存储空间原因被系统清理，否则数据都一直可用.” **单个 key 最大 1MB，所有数据存储上限 10MB.** Data: native types, Date, or `JSON.stringify`-able objects.

Encrypt (`encrypt: true`, 2.21.3) is **async `setStorage` only**. AES128; data ~1.4× larger; then 0.7MB per key, 7.1MB total. `setStorageSync` has no encrypt parameter.

[`wx.setStorageSync` 注意](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorageSync.html): storage is for persistence, not runtime globals; too many sync reads/writes at startup hurt launch time.

[存储](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/storage.html): “同一个微信用户，同一个小程序 storage 上限为 10MB”; isolated per WeChat account and per appId. “本地缓存的清理时机跟代码包一样，只有在代码包被清理的时候本地缓存才会被清理.” (That cleanup sentence is stricter than setStorage’s “因存储空间原因被系统清理.”)

[`wx.getStorageInfo`](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.getStorageInfo.html): `keys`, `currentSize` (KB), `limitSize` (KB).

Library metadata (titles, Source URLs, Stage/Show ids) and resume `{currentTime}` fit these limits if kept as JSON, not as media bytes. Isolation is the WeChat account on the device, not a SET login (v1 has none).

**Silent:** exact eviction under “存储空间原因”; whether 打开调试 / reinstall / 开发版 overwrite clears storage; per-os differences.

---

## Docs that are silent (do not guess)

- `video` network `src` vs downloadFile 合法域名.
- `video` `src` HTTP (non-LAN) on iOS vs Android, ATS for the player.
- `video` `src` to a LAN IP getting the [局域网通信](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/mDNS.html) HTTP/no-whitelist exemption.
- Max size / duration / bitrate of streamed `video` playback.
- Audio codec requirements inside those containers.
- Whether 开发版/体验版 without 打开调试 is looser than 线上版本 for media `src`.
- NAS / SMB / DLNA as a Source except the generic LAN IP rules for the four network APIs.
- `chooseMedia` / `chooseMessageFile` as ingest for a multi-episode Library on a computer.
- Reconciling filesystem **200MB** vs `saveFile` **100M**.

---

## Implications for SET v1

Facts only; not product choices.

1. A Source can be passed to `video` `src` as a network path or as a local temp path. SET is not required by these APIs to hold video bytes. Persistent file storage (200MB shared, and `saveFile`’s 100M error text) cannot hold a TV-episode corpus.

2. `wx.downloadFile` is not a path for episode-sized files: 200MB per call, HTTPS GET (unless the documented LAN IP case), downloadFile 合法域名 unless skip or LAN IP, default 60s timeout, 10 concurrent, killed after 5s in background.

3. 开发版/体验版 does not, by itself, turn off 合法域名. Skip = DevTools option + 打开调试 on the phone. A Learner running 体验版 with debug off is under the HTTPS + ICP + whitelist rules for the named network APIs.

4. Same-Wi-Fi NAS/PC: `wx.request` / `wx.downloadFile` to `http://<lan-ip>:<port>/...` are documented (same subnet, not 本机, no 安全域, HTTP allowed). `video` `src` to that URL is not named on the LAN page. localhost and the phone’s own IP are excluded. mDNS discovery is broken on iOS WeChat ≥ 7.0.18.

5. Cross-platform Source containers in the official table are mp4, 3gp, m3u8; codecs H.264, HEVC, MPEG-4. mov/m4v/avi are iOS-only; webm and VP9 are Android-only.

6. Resume can use `initial-time` / `VideoContext.seek` (seek argument in seconds) and `bind:timeupdate`. `bind:seekcomplete` reports seconds on iOS and milliseconds on Android. Position values belong in `wx.setStorage` / `wx.setStorageSync` (1MB/key, 10MB total), which is isolated per WeChat account and cleared at least when the code package is cleared (and possibly under storage pressure).

7. `chooseMedia` is album/camera (camera clip ≤ 60s). `chooseMessageFile` is WeChat chat files. Both return temp paths. They are not documented as a NAS Library ingest, and saving chosen files persistently hits the 200MB / 100M caps.

8. iOS rejects self-signed HTTPS certificates for the network APIs; ATS applies. Old Android TLS 1.2 support is called out. `video` HTTPS playback failures are pointed at that same certificate checklist.
