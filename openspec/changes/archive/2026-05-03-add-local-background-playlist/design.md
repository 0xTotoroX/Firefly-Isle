## Context

`add-background-music-toggle` introduced one app-level background audio provider, one audio element, one local source, and one shared toggle. The new requirement keeps that architecture but replaces the single source with a local authorized playlist based on two user-provided songs.

Browsers still control audible autoplay. The app can request playback on boot when the user's preference is `on`, but it must treat blocked playback as normal recoverable state. Apple Music links are metadata references only; the runtime source is a local file path under `public/audio/tracks/`.

## Goals / Non-Goals

**Goals:**

- Represent two local tracks with typed metadata and public file URLs.
- Persist the selected track independently from the existing on/off preference.
- Let users switch to previous/next tracks from the existing music control.
- Advance to the next track when the current track ends.
- Preserve existing route, auth, extraction, edit, export, theme, and language semantics.

**Non-Goals:**

- No Apple Music downloading, DRM bypass, streaming proxy, or remote playback dependency.
- No full player UI with timeline, volume slider, waveform, queue editor, or user upload flow.
- No backend schema, Supabase storage, or account-scoped playlist persistence.

## Decisions

### Decision 1: Track manifest is source code, audio files are local public assets

Add a small `background-audio-tracks.ts` module exporting the two track records. Each record includes `id`, `title`, optional `artist` / `album`, `sourceUrl`, and `fileUrl`.

Alternative considered: derive tracks by scanning `public/audio/tracks/`. Vite static assets do not provide a runtime directory index, and implicit discovery hides missing-file mistakes. A manifest is boring, explicit, and testable.

### Decision 2: Keep one controller, add track state

Extend the existing controller instead of adding a second playlist store. The snapshot gains `currentTrackId`; actions gain `selectTrack`, `nextTrack`, and `previousTrack`.

Alternative considered: leave the controller untouched and make the UI mutate `audio.src`. That splits truth between UI and provider. The audio controller owns the element, so it must own the source.

### Decision 3: Persist selected track only

Keep `firefly-background-audio` for on/off intent and add `firefly-background-audio-track` for the selected track id. Runtime status remains derived from the audio element.

Alternative considered: persist current playback status. Browser playback state is transient and stale across reloads; only user intent belongs in storage.

### Decision 4: Ended event advances through the playlist

Set `audio.loop = false` when multiple tracks exist and handle `ended` by selecting the next track. If preference is `on`, the controller requests playback for the newly selected source.

Alternative considered: keep looping the same track forever. That contradicts the user's selected multi-song playlist and makes next/previous the only way to hear other songs.

### Decision 5: Compact playlist UI extends the existing toggle

The existing toggle remains the visible entry. When rendered with enough room, it shows the current track and previous/next icon buttons adjacent to the main play/off button. It does not add a separate route-level player or card.

Alternative considered: full player popover. It is heavier than requested and would compete with the clinical app shell.

## Risks / Trade-offs

- [Risk] Local track files are absent at implementation time -> Mitigation: commit only manifest and documentation; controller falls into `unavailable` if playback errors.
- [Risk] A selected track id no longer exists after manifest edits -> Mitigation: read storage through a validator and fall back to the first track.
- [Risk] Switching tracks while music is `off` unexpectedly starts audio -> Mitigation: track selection updates the source and persists the id, but playback starts only if preference is `on`.
- [Risk] Browser blocks autoplay after track advance -> Mitigation: reuse existing blocked status and user-triggered recovery path.
- [Risk] Shell action clutter grows -> Mitigation: keep controls icon-first, stable-size, and scoped to the existing music component.

## Migration Plan

1. Add playlist tests that fail against the current single-source controller.
2. Add the track manifest and extend the controller state/actions.
3. Extend the shared music control with compact previous/current/next controls.
4. Update architecture docs and asset boundary docs.
5. Run test, type-check, lint, build, and OpenSpec validation.

Rollback removes the playlist manifest and compact controls, then restores the provider to a single configured `BACKGROUND_AUDIO_SRC` without touching business routes.

## Open Questions

None. The selected implementation uses two user-provided local audio files and keeps Apple Music references as metadata only.
