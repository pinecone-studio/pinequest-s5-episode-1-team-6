'use client';

// Full screen for one element (the video with its overlays). Uses the browser's Fullscreen API;
// where an element can't go full screen (iPhone Safari), the element is stretched over the page
// instead. Escape leaves either way.

import { useCallback, useEffect, useState, type RefObject } from 'react';

export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [native, setNative] = useState(false); // the browser's full screen
  const [stretched, setStretched] = useState(false); // our fallback: fixed over the whole page

  useEffect(() => {
    const onChange = () => setNative(document.fullscreenElement !== null && document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [ref]);

  useEffect(() => {
    if (!stretched) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStretched(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [stretched]);

  const enter = useCallback(async () => {
    const element = ref.current;
    if (!element) return;
    if (document.fullscreenEnabled && typeof element.requestFullscreen === 'function') {
      try {
        await element.requestFullscreen({ navigationUI: 'hide' });
        return;
      } catch {
        /* not allowed here: stretch instead */
      }
    }
    setStretched(true);
  }, [ref]);

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    setStretched(false);
  }, []);

  return { fullscreen: native || stretched, stretched, enter, exit };
}
