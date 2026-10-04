# audio/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
background-music.mp3: 旧版 MVP 背景音乐占位资产，由本地 FFmpeg 正弦波合成生成，保留作历史回退，不再是当前默认歌单源
tracks/: 用户提供的本地授权歌单音频目录，文件名由 `src/lib/background-audio-tracks.ts` manifest 指定

法则: 这里只放可公开发布的音频；商业歌曲必须由用户提供授权文件，禁止从 Apple Music 下载或绕过 DRM。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
