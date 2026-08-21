import { useCallback, useEffect, useRef, useState } from 'react';

// Drives the song player's clock. Branches internally on whether the song has
// real audio (ElevenLabs returned a track) or not (ELEVENLABS_API_KEY unset or
// the compose call failed — see lib/transforms/song.js), so SongContent's
// player controls are identical in both cases.
//
//   song.audioUrl set  -> a real HTMLAudioElement is the source of truth
//   song.audioUrl null -> a 250ms interval simulates playback up to
//                         song.durationSeconds
//
// Returns { isPlaying, elapsed, duration, isSimulated, toggle, seek, restart }.

const TICK_MS = 250;

export function useSongPlayback(song) {
  const audioUrl = song?.audioUrl || null;
  const estimatedDuration = song?.durationSeconds || 0;

  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  // Prefer the real track's length once the browser has read its metadata;
  // fall back to the server's estimate until then (and always, when simulated).
  const duration = audioUrl && audioDuration ? audioDuration : estimatedDuration;

  // ---- Real audio: own an <audio> element for the lifetime of this URL ----
  useEffect(() => {
    if (!audioUrl) return undefined;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) setAudioDuration(audio.duration);
    };
    const onTimeUpdate = () => setElapsed(audio.currentTime);
    const onEnded = () => {
      setIsPlaying(false);
      setElapsed(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      audioRef.current = null;
      setIsPlaying(false);
      setElapsed(0);
      setAudioDuration(0);
    };
  }, [audioUrl]);

  // ---- Simulated playback: tick the clock ourselves ----
  useEffect(() => {
    if (audioUrl || !isPlaying) return undefined;

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + TICK_MS / 1000;
        if (next >= duration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, TICK_MS);

    return () => clearInterval(intervalRef.current);
  }, [audioUrl, isPlaying, duration]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      if (audio.paused) {
        // Autoplay policies can reject this if there was no user gesture;
        // keep the UI honest by only flipping to "playing" once it resolves.
        audio.play().then(
          () => setIsPlaying(true),
          () => setIsPlaying(false)
        );
      } else {
        audio.pause();
        setIsPlaying(false);
      }
      return;
    }
    setIsPlaying((prev) => !prev);
  }, []);

  const seek = useCallback(
    (seconds) => {
      const target = Math.min(Math.max(seconds, 0), duration || 0);
      const audio = audioRef.current;
      if (audio) audio.currentTime = target;
      setElapsed(target);
    },
    [duration]
  );

  const restart = useCallback(() => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = 0;
    setElapsed(0);
  }, []);

  return {
    isPlaying,
    elapsed,
    duration,
    isSimulated: !audioUrl,
    toggle,
    seek,
    restart,
  };
}
