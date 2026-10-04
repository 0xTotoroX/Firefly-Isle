/**
 * [INPUT]: 依赖 react 的 Context、hooks，依赖 background-audio-tracks 的本地歌单 manifest，依赖浏览器 Audio 与 localStorage。
 * [OUTPUT]: 对外提供 BackgroundAudioProvider、useBackgroundAudio、背景音状态类型、曲目 API、静态音频路径与可测试控制器。
 * [POS]: lib 的全局背景音乐状态中心，独占单一 audio 实例、歌单曲目、播放/暂停意图、自动播放拦截与当前播放状态。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  BACKGROUND_AUDIO_TRACKS,
  findBackgroundAudioTrack,
  type BackgroundAudioTrack,
} from '@/lib/background-audio-tracks'

export { BACKGROUND_AUDIO_TRACKS, type BackgroundAudioTrack } from '@/lib/background-audio-tracks'

export type BackgroundAudioPreference = 'playing' | 'paused'
export type BackgroundAudioStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'blocked' | 'unavailable'

export type BackgroundAudioSnapshot = {
  currentTrackId: string
  preference: BackgroundAudioPreference
  status: BackgroundAudioStatus
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

type AudioLike = {
  addEventListener?: (event: string, listener: () => void) => void
  load?: () => void
  loop: boolean
  pause: () => void
  paused: boolean
  play: () => Promise<void>
  preload: string
  removeEventListener?: (event: string, listener: () => void) => void
  src: string
  volume: number
}

type BackgroundAudioControllerOptions = {
  audio: AudioLike | null
  onChange?: (snapshot: BackgroundAudioSnapshot) => void
  storage?: StorageLike | null
  tracks?: BackgroundAudioTrack[]
  volume?: number
}

export type BackgroundAudioController = {
  destroy: () => void
  getSnapshot: () => BackgroundAudioSnapshot
  nextTrack: () => Promise<BackgroundAudioSnapshot>
  previousTrack: () => Promise<BackgroundAudioSnapshot>
  requestPlayback: () => Promise<BackgroundAudioSnapshot>
  selectTrack: (trackId: string) => Promise<BackgroundAudioSnapshot>
  subscribe: (listener: (snapshot: BackgroundAudioSnapshot) => void) => () => void
  toggle: () => Promise<BackgroundAudioSnapshot>
  pause: () => BackgroundAudioSnapshot
  resume: () => Promise<BackgroundAudioSnapshot>
}

export type BackgroundAudioContextValue = BackgroundAudioSnapshot & {
  currentTrack: BackgroundAudioTrack
  nextTrack: () => Promise<BackgroundAudioSnapshot>
  previousTrack: () => Promise<BackgroundAudioSnapshot>
  requestPlayback: () => Promise<BackgroundAudioSnapshot>
  selectTrack: (trackId: string) => Promise<BackgroundAudioSnapshot>
  toggle: () => Promise<BackgroundAudioSnapshot>
  tracks: BackgroundAudioTrack[]
  pause: () => BackgroundAudioSnapshot
  resume: () => Promise<BackgroundAudioSnapshot>
}

export const BACKGROUND_AUDIO_SRC = BACKGROUND_AUDIO_TRACKS[0].fileUrl
export const BACKGROUND_AUDIO_STORAGE_KEY = 'firefly-background-audio'
export const BACKGROUND_AUDIO_TRACK_STORAGE_KEY = 'firefly-background-audio-track'
export const BACKGROUND_AUDIO_VOLUME = 0.28

const BackgroundAudioContext = createContext<BackgroundAudioContextValue | null>(null)

function readBrowserStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function safeTracks(tracks: BackgroundAudioTrack[]) {
  return tracks.length > 0 ? tracks : BACKGROUND_AUDIO_TRACKS
}

export function readBackgroundAudioPreference(storage: StorageLike | null = readBrowserStorage()): BackgroundAudioPreference {
  const storedPreference = storage?.getItem(BACKGROUND_AUDIO_STORAGE_KEY)
  return storedPreference === 'playing' || storedPreference === 'on' ? 'playing' : 'paused'
}

export function readBackgroundAudioTrackId(
  storage: StorageLike | null = readBrowserStorage(),
  tracks: BackgroundAudioTrack[] = BACKGROUND_AUDIO_TRACKS,
) {
  const playlist = safeTracks(tracks)
  const storedTrackId = storage?.getItem(BACKGROUND_AUDIO_TRACK_STORAGE_KEY)

  return playlist.some((track) => track.id === storedTrackId) ? storedTrackId as string : playlist[0].id
}

function writeBackgroundAudioPreference(storage: StorageLike | null, preference: BackgroundAudioPreference) {
  storage?.setItem(BACKGROUND_AUDIO_STORAGE_KEY, preference)
}

function writeBackgroundAudioTrackId(storage: StorageLike | null, trackId: string) {
  storage?.setItem(BACKGROUND_AUDIO_TRACK_STORAGE_KEY, trackId)
}

function getInitialSnapshot(storage: StorageLike | null, tracks = BACKGROUND_AUDIO_TRACKS): BackgroundAudioSnapshot {
  const preference = readBackgroundAudioPreference(storage)

  return {
    currentTrackId: readBackgroundAudioTrackId(storage, tracks),
    preference,
    status: preference === 'paused' ? 'paused' : 'idle',
  }
}

function isAutoplayBlocked(error: unknown) {
  return error instanceof DOMException && error.name === 'NotAllowedError'
}

function configureAudio(audio: AudioLike, track: BackgroundAudioTrack, volume: number, loop: boolean) {
  audio.src = track.fileUrl
  audio.loop = loop
  audio.preload = 'auto'
  audio.volume = volume
}

function getOffsetTrackId(tracks: BackgroundAudioTrack[], currentTrackId: string, offset: number) {
  const currentIndex = Math.max(0, tracks.findIndex((track) => track.id === currentTrackId))
  const nextIndex = (currentIndex + offset + tracks.length) % tracks.length

  return tracks[nextIndex].id
}

export function createBackgroundAudioController({
  audio,
  onChange,
  storage = readBrowserStorage(),
  tracks = BACKGROUND_AUDIO_TRACKS,
  volume = BACKGROUND_AUDIO_VOLUME,
}: BackgroundAudioControllerOptions): BackgroundAudioController {
  const playlist = safeTracks(tracks)
  const shouldLoop = playlist.length < 2
  let snapshot: BackgroundAudioSnapshot = audio ? getInitialSnapshot(storage, playlist) : {
    currentTrackId: readBackgroundAudioTrackId(storage, playlist),
    preference: readBackgroundAudioPreference(storage),
    status: 'unavailable',
  }
  const listeners = new Set<(snapshot: BackgroundAudioSnapshot) => void>()

  if (audio) {
    configureAudio(audio, findBackgroundAudioTrack(snapshot.currentTrackId, playlist), volume, shouldLoop)
  }

  const publish = (nextSnapshot: BackgroundAudioSnapshot) => {
    snapshot = nextSnapshot
    onChange?.(snapshot)
    for (const listener of listeners) {
      listener(snapshot)
    }
  }

  const setStatus = (status: BackgroundAudioStatus) => {
    publish({ ...snapshot, status })
  }

  const setPreference = (preference: BackgroundAudioPreference) => {
    writeBackgroundAudioPreference(storage, preference)
    publish({ ...snapshot, preference })
  }

  const requestPlayback = async () => {
    if (!audio) {
      setStatus('unavailable')
      return snapshot
    }

    if (snapshot.preference === 'paused') {
      setStatus('paused')
      return snapshot
    }

    setStatus('loading')

    try {
      await audio.play()
      setStatus('playing')
    } catch (error) {
      setStatus(isAutoplayBlocked(error) ? 'blocked' : 'unavailable')
    }

    return snapshot
  }

  const selectTrack = async (trackId: string) => {
    const nextTrack = findBackgroundAudioTrack(trackId, playlist)
    writeBackgroundAudioTrackId(storage, nextTrack.id)
    publish({ ...snapshot, currentTrackId: nextTrack.id, status: snapshot.preference === 'paused' ? 'paused' : 'idle' })

    if (!audio) {
      setStatus('unavailable')
      return snapshot
    }

    configureAudio(audio, nextTrack, volume, shouldLoop)
    return snapshot.preference === 'playing' ? requestPlayback() : snapshot
  }

  const nextTrack = () => selectTrack(getOffsetTrackId(playlist, snapshot.currentTrackId, 1))
  const previousTrack = () => selectTrack(getOffsetTrackId(playlist, snapshot.currentTrackId, -1))

  const pause = () => {
    setPreference('paused')
    audio?.pause()
    setStatus('paused')
    return snapshot
  }

  const resume = async () => {
    setPreference('playing')
    return requestPlayback()
  }

  const toggle = async () => {
    if (snapshot.status === 'idle' || snapshot.status === 'loading' || snapshot.status === 'playing') {
      return pause()
    }

    return resume()
  }

  const markPlaying = () => setStatus('playing')
  const markPaused = () => {
    if (snapshot.status === 'blocked' || snapshot.status === 'unavailable') {
      return
    }

    setStatus('paused')
  }
  const markUnavailable = () => setStatus('unavailable')
  const markEnded = () => {
    if (playlist.length > 1) {
      void nextTrack()
      return
    }

    setStatus('paused')
  }

  audio?.addEventListener?.('play', markPlaying)
  audio?.addEventListener?.('pause', markPaused)
  audio?.addEventListener?.('error', markUnavailable)
  audio?.addEventListener?.('ended', markEnded)

  const subscribe = (listener: (snapshot: BackgroundAudioSnapshot) => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const destroy = () => {
    audio?.removeEventListener?.('play', markPlaying)
    audio?.removeEventListener?.('pause', markPaused)
    audio?.removeEventListener?.('error', markUnavailable)
    audio?.removeEventListener?.('ended', markEnded)
    listeners.clear()
  }

  return {
    destroy,
    getSnapshot: () => snapshot,
    nextTrack,
    previousTrack,
    requestPlayback,
    selectTrack,
    subscribe,
    toggle,
    pause,
    resume,
  }
}

function createBrowserAudio(source: string): AudioLike | null {
  if (typeof Audio === 'undefined') {
    return null
  }

  return new Audio(source)
}

export function BackgroundAudioProvider({ children, persist = true }: PropsWithChildren<{ persist?: boolean }>) {
  const controllerRef = useRef<BackgroundAudioController | null>(null)
  const [snapshot, setSnapshot] = useState<BackgroundAudioSnapshot>(() => getInitialSnapshot(persist ? readBrowserStorage() : null))

  useEffect(() => {
    const controller = createBackgroundAudioController({
      audio: createBrowserAudio(BACKGROUND_AUDIO_SRC),
      onChange: setSnapshot,
      storage: persist ? readBrowserStorage() : null,
    })

    controllerRef.current = controller

    if (controller.getSnapshot().preference === 'playing') {
      queueMicrotask(() => {
        if (controllerRef.current === controller) {
          void controller.requestPlayback()
        }
      })
    }

    return () => {
      controller.destroy()
      controllerRef.current = null
    }
  }, [persist])

  const requestPlayback = useCallback(() => controllerRef.current?.requestPlayback() ?? Promise.resolve(snapshot), [snapshot])
  const pause = useCallback(() => controllerRef.current?.pause() ?? snapshot, [snapshot])
  const resume = useCallback(() => controllerRef.current?.resume() ?? Promise.resolve(snapshot), [snapshot])
  const toggle = useCallback(() => controllerRef.current?.toggle() ?? Promise.resolve(snapshot), [snapshot])
  const selectTrack = useCallback((trackId: string) => controllerRef.current?.selectTrack(trackId) ?? Promise.resolve(snapshot), [snapshot])
  const nextTrack = useCallback(() => controllerRef.current?.nextTrack() ?? Promise.resolve(snapshot), [snapshot])
  const previousTrack = useCallback(() => controllerRef.current?.previousTrack() ?? Promise.resolve(snapshot), [snapshot])
  const currentTrack = useMemo(() => findBackgroundAudioTrack(snapshot.currentTrackId), [snapshot.currentTrackId])

  const value = useMemo(
    () => ({
      ...snapshot,
      currentTrack,
      nextTrack,
      previousTrack,
      requestPlayback,
      selectTrack,
      toggle,
      tracks: BACKGROUND_AUDIO_TRACKS,
      pause,
      resume,
    }),
    [currentTrack, nextTrack, pause, previousTrack, requestPlayback, resume, selectTrack, snapshot, toggle],
  )

  return <BackgroundAudioContext.Provider value={value}>{children}</BackgroundAudioContext.Provider>
}

export function useBackgroundAudio() {
  const context = useContext(BackgroundAudioContext)

  if (!context) {
    throw new Error('useBackgroundAudio must be used within BackgroundAudioProvider')
  }

  return context
}
