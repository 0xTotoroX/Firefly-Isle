/**
 * [INPUT]: 依赖用户提供的 Nagisa / Merry Christmas Mr. Lawrence 本地授权音频与 Apple Music 来源链接。
 * [OUTPUT]: 对外提供 BackgroundAudioTrack 类型、BACKGROUND_AUDIO_TRACKS 清单与曲目查找函数。
 * [POS]: src/lib 的背景歌单 manifest，给 background-audio 控制器提供唯一曲目真相源。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
export type BackgroundAudioTrack = {
  album?: string
  artist?: string
  fileUrl: string
  id: string
  sourceUrl: string
  title: string
}

export const BACKGROUND_AUDIO_TRACKS: BackgroundAudioTrack[] = [
  {
    fileUrl: '/audio/tracks/nagisa-sakano-shitano-wakare.mp3',
    id: 'nagisa-sakano-shitano-wakare',
    sourceUrl: 'https://music.apple.com/cn/album/nagisa-sakano-shitano-wakare/823583025?i=823583273',
    title: 'Nagisa Sakano Shitano Wakare',
  },
  {
    fileUrl: '/audio/tracks/merry-christmas-mr-lawrence.mp3',
    id: 'merry-christmas-mr-lawrence',
    sourceUrl: 'https://music.apple.com/cn/album/merry-christmas-mr-lawrence/1581111685?i=1581111688',
    title: 'Merry Christmas Mr. Lawrence',
  },
]

export function findBackgroundAudioTrack(trackId: string, tracks = BACKGROUND_AUDIO_TRACKS) {
  return tracks.find((track) => track.id === trackId) ?? tracks[0]
}
