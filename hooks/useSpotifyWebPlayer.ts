"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpotifySdkTrack = {
  name: string;
  uri: string;
  duration_ms: number;
  artists: Array<{ name: string }>;
  album: { name: string; images: Array<{ url: string }> };
};

type SpotifySdkState = {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: SpotifySdkTrack;
  };
};

type SpotifyPlayerListener = (payload: { device_id: string }) => void;
type SpotifyErrorListener = (payload: { message: string }) => void;
type SpotifyStateListener = (payload: SpotifySdkState | null) => void;

type SpotifyPlayer = {
  connect(): Promise<boolean>;
  disconnect(): void;
  togglePlay(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  setVolume(volume: number): Promise<void>;
  activateElement(): Promise<void>;
  addListener(event: "ready" | "not_ready", listener: SpotifyPlayerListener): boolean;
  addListener(
    event: "initialization_error" | "authentication_error" | "account_error" | "playback_error",
    listener: SpotifyErrorListener,
  ): boolean;
  addListener(event: "player_state_changed", listener: SpotifyStateListener): boolean;
  removeListener(event: string): boolean;
};

type SpotifyPlayerConstructor = new (options: {
  name: string;
  getOAuthToken(callback: (token: string) => void): void;
  volume?: number;
}) => SpotifyPlayer;

declare global {
  interface Window {
    Spotify?: {
      Player: SpotifyPlayerConstructor;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

let spotifySdkPromise: Promise<void> | null = null;

function loadSpotifySdk() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Spotify player can only run in the browser."));
  }

  if (window.Spotify?.Player) {
    return Promise.resolve();
  }

  if (spotifySdkPromise) {
    return spotifySdkPromise;
  }

  spotifySdkPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://sdk.scdn.co/spotify-player.js"]');
    const timeout = window.setTimeout(() => reject(new Error("Spotify player took too long to load.")), 12_000);

    window.onSpotifyWebPlaybackSDKReady = () => {
      window.clearTimeout(timeout);
      resolve();
    };

    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("Spotify player could not load."));
    };
    document.body.appendChild(script);
  });

  return spotifySdkPromise;
}

export function useSpotifyWebPlayer(accessToken: string | null, enabled: boolean) {
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const accessTokenRef = useRef(accessToken);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<SpotifySdkState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;

    if (!accessToken || !enabled) {
      playerRef.current?.disconnect();
      playerRef.current = null;
      setDeviceId(null);
      setReady(false);
      setState(null);
      return;
    }

    void loadSpotifySdk()
      .then(() => {
        if (cancelled || !window.Spotify?.Player) {
          return;
        }

        const player = new window.Spotify.Player({
          name: "GrubX Web Player",
          getOAuthToken(callback) {
            if (accessTokenRef.current) {
              callback(accessTokenRef.current);
            }
          },
          volume: 0.7,
        });

        player.addListener("ready", ({ device_id }) => {
          setDeviceId(device_id);
          setReady(true);
          setError("");
        });

        player.addListener("not_ready", ({ device_id }) => {
          setDeviceId((currentDeviceId) => (currentDeviceId === device_id ? null : currentDeviceId));
          setReady(false);
        });

        player.addListener("player_state_changed", setState);
        player.addListener("initialization_error", ({ message }) => setError(message));
        player.addListener("authentication_error", ({ message }) => setError(message));
        player.addListener("account_error", ({ message }) => setError(message));
        player.addListener("playback_error", ({ message }) => setError(message));

        playerRef.current = player;
        void player.connect().then((connected) => {
          if (!connected) {
            setError("Spotify player could not connect.");
          }
        });
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Spotify player could not load.");
      });

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [accessToken, enabled]);

  const activate = useCallback(() => playerRef.current?.activateElement(), []);
  const togglePlay = useCallback(() => playerRef.current?.togglePlay(), []);
  const pause = useCallback(() => playerRef.current?.pause(), []);
  const resume = useCallback(() => playerRef.current?.resume(), []);
  const nextTrack = useCallback(() => playerRef.current?.nextTrack(), []);
  const previousTrack = useCallback(() => playerRef.current?.previousTrack(), []);
  const setVolume = useCallback((volume: number) => playerRef.current?.setVolume(volume), []);

  return {
    deviceId,
    ready,
    state,
    error,
    activate,
    togglePlay,
    pause,
    resume,
    nextTrack,
    previousTrack,
    setVolume,
  };
}
