// src/hooks/useYouTubePlayer.ts
//
// Thin wrapper around the YouTube IFrame Player API. YouTube iframes cannot
// be driven via the HTMLMediaElement interface (currentTime / play / pause),
// so the shadowing controls must talk to the iframe through this API.
//
// Usage:
//   const yt = useYouTubePlayer({ videoId, onTick });
//   <div ref={yt.containerRef} className="w-full h-full" />
//   yt.seekTo(seg.startTime); yt.play(); yt.setRate(1.25);
//
// `onTick` fires every ~250ms with the current playback time once the player
// is ready — pass a stable callback (useCallback) to drive auto-stop / loop /
// transcript highlighting.

import { useCallback, useEffect, useRef } from "react";

declare global {
    interface Window {
        YT?: any;
        onYouTubeIframeAPIReady?: () => void;
    }
}

const SCRIPT_ID = "yt-iframe-api";

function loadYouTubeAPI(): Promise<any> {
    if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
    if (window.YT?.Player) return Promise.resolve(window.YT);

    return new Promise((resolve) => {
        // Chain onto whatever else might be waiting.
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            try {
                prev?.();
            } catch {
                /* ignore */
            }
            resolve(window.YT);
        };
        if (!document.getElementById(SCRIPT_ID)) {
            const script = document.createElement("script");
            script.id = SCRIPT_ID;
            script.src = "https://www.youtube.com/iframe_api";
            script.async = true;
            document.body.appendChild(script);
        }
    });
}

export type YouTubePlayerHandle = {
    containerRef: (el: HTMLDivElement | null) => void;
    isReady: () => boolean;
    play: () => void;
    pause: () => void;
    toggle: () => void;
    seekTo: (t: number, autoPlay?: boolean) => void;
    setRate: (rate: number) => void;
    getCurrentTime: () => number;
    getState: () => number; // YT.PlayerState
};

type Options = {
    videoId: string;
    onTick?: (currentTime: number, state: number) => void;
    onReady?: () => void;
    pollMs?: number;
};

export function useYouTubePlayer({ videoId, onTick, onReady, pollMs = 250 }: Options): YouTubePlayerHandle {
    const playerRef = useRef<any>(null);
    const readyRef = useRef(false);
    const containerElRef = useRef<HTMLDivElement | null>(null);
    const onTickRef = useRef(onTick);
    const onReadyRef = useRef(onReady);

    onTickRef.current = onTick;
    onReadyRef.current = onReady;

    // (Re)mount the player whenever the videoId changes.
    useEffect(() => {
        if (!videoId) return;
        let cancelled = false;

        const mount = async () => {
            const YT = await loadYouTubeAPI();
            if (cancelled || !containerElRef.current) return;
            // Tear down previous instance if any.
            try {
                playerRef.current?.destroy?.();
            } catch {
                /* ignore */
            }
            readyRef.current = false;
            playerRef.current = new YT.Player(containerElRef.current, {
                width: "100%",
                height: "100%",
                videoId,
                playerVars: {
                    modestbranding: 1,
                    rel: 0,
                    playsinline: 1,
                    enablejsapi: 1,
                    origin: window.location.origin,
                },
                events: {
                    onReady: () => {
                        readyRef.current = true;
                        onReadyRef.current?.();
                    },
                },
            });
        };
        void mount();

        return () => {
            cancelled = true;
            try {
                playerRef.current?.destroy?.();
            } catch {
                /* ignore */
            }
            playerRef.current = null;
            readyRef.current = false;
        };
    }, [videoId]);

    // Polling loop for auto-stop / loop / transcript-sync features.
    useEffect(() => {
        if (!onTick) return;
        const interval = setInterval(() => {
            if (!readyRef.current || !playerRef.current) return;
            try {
                const t = playerRef.current.getCurrentTime?.() ?? 0;
                const state = playerRef.current.getPlayerState?.() ?? -1;
                onTickRef.current?.(t, state);
            } catch {
                /* getCurrentTime can throw mid-destroy — ignore */
            }
        }, pollMs);
        return () => clearInterval(interval);
    }, [onTick, pollMs]);

    const setContainer = useCallback((el: HTMLDivElement | null) => {
        containerElRef.current = el;
    }, []);

    const isReady = useCallback(() => readyRef.current, []);
    const play = useCallback(() => {
        if (readyRef.current) playerRef.current?.playVideo?.();
    }, []);
    const pause = useCallback(() => {
        if (readyRef.current) playerRef.current?.pauseVideo?.();
    }, []);
    const toggle = useCallback(() => {
        if (!readyRef.current) return;
        const state = playerRef.current?.getPlayerState?.() ?? -1;
        // 1 = playing, 3 = buffering
        if (state === 1 || state === 3) playerRef.current?.pauseVideo?.();
        else playerRef.current?.playVideo?.();
    }, []);
    const seekTo = useCallback((t: number, autoPlay = true) => {
        if (!readyRef.current) return;
        try {
            playerRef.current?.seekTo?.(t, true);
            if (autoPlay) playerRef.current?.playVideo?.();
        } catch {
            /* ignore */
        }
    }, []);
    const setRate = useCallback((rate: number) => {
        if (readyRef.current) {
            try {
                playerRef.current?.setPlaybackRate?.(rate);
            } catch {
                /* ignore */
            }
        }
    }, []);
    const getCurrentTime = useCallback(() => {
        try {
            return readyRef.current ? playerRef.current?.getCurrentTime?.() ?? 0 : 0;
        } catch {
            return 0;
        }
    }, []);
    const getState = useCallback(() => {
        try {
            return readyRef.current ? playerRef.current?.getPlayerState?.() ?? -1 : -1;
        } catch {
            return -1;
        }
    }, []);

    return {
        containerRef: setContainer,
        isReady,
        play,
        pause,
        toggle,
        seekTo,
        setRate,
        getCurrentTime,
        getState,
    };
}
