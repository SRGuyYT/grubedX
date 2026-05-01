"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  ListMusic,
  Loader2,
  LogIn,
  LogOut,
  Music,
  Pause,
  Play,
  Plus,
  Search,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { ExternalEmbedFrame } from "@/components/media/ExternalEmbedFrame";
import { useSpotifyWebPlayer } from "@/hooks/useSpotifyWebPlayer";
import { cn } from "@/lib/cn";
import type {
  SpotifyAlbumSummary,
  SpotifyArtistSummary,
  SpotifyPlaylistSummary,
  SpotifySearchResponse,
  SpotifySessionResponse,
  SpotifyTrackSummary,
} from "@/types/spotify";

type SearchType = "all" | "track" | "album" | "artist" | "playlist";

const searchTypes: Array<{ value: SearchType; label: string }> = [
  { value: "all", label: "All" },
  { value: "track", label: "Tracks" },
  { value: "album", label: "Albums" },
  { value: "artist", label: "Artists" },
  { value: "playlist", label: "Playlists" },
];

const emptySearch: SpotifySearchResponse = {
  tracks: [],
  albums: [],
  artists: [],
  playlists: [],
};

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const spotifyTypeParam = (type: SearchType) => (type === "all" ? "track,album,artist,playlist" : type);

function SetupPanel({ redirectUri }: { redirectUri?: string }) {
  return (
    <div className="liquid-glass-soft rounded-[1rem] border border-white/10 p-5">
      <p className="text-sm font-semibold text-white">Spotify API setup is needed</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Add your Spotify app credentials to the server environment, then add this redirect URI in the Spotify Developer Dashboard.
      </p>
      <div className="mt-4 grid gap-2 rounded-[0.9rem] border border-white/10 bg-black/34 p-4 text-xs text-white/82">
        <code>SPOTIFY_CLIENT_ID=</code>
        <code>SPOTIFY_CLIENT_SECRET=</code>
        <code>SPOTIFY_REDIRECT_URI={redirectUri ?? "http://localhost:3000/api/spotify/callback"}</code>
      </div>
    </div>
  );
}

function AlbumArt({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
  return imageUrl ? (
    <img src={imageUrl} alt="" className="size-16 shrink-0 rounded-[0.65rem] object-cover" />
  ) : (
    <div className="grid size-16 shrink-0 place-items-center rounded-[0.65rem] border border-white/10 bg-white/6">
      <Music className="size-5 text-[var(--muted)]" />
      <span className="sr-only">{name}</span>
    </div>
  );
}

function TrackResult({
  track,
  selected,
  playerReady,
  premium,
  onPlay,
  onAdd,
}: {
  track: SpotifyTrackSummary;
  selected: boolean;
  playerReady: boolean;
  premium: boolean;
  onPlay: (track: SpotifyTrackSummary) => void;
  onAdd: (track: SpotifyTrackSummary) => void;
}) {
  return (
    <div className="group flex min-w-0 flex-col gap-4 rounded-[1rem] border border-white/10 bg-white/[0.035] p-3 transition hover:border-white/18 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <AlbumArt imageUrl={track.imageUrl} name={track.name} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{track.name}</p>
          <p className="mt-1 truncate text-sm text-[var(--muted)]">{track.artists.join(", ") || "Unknown artist"}</p>
          <p className="mt-1 truncate text-xs text-white/44">
            {track.album ?? "Single"} • {formatDuration(track.durationMs)}
            {track.explicit ? " • Explicit" : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onPlay(track)}
          disabled={!premium || !playerReady}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          title={!premium ? "Spotify Premium is required for web playback." : undefined}
        >
          <Play className="size-4" />
          Play
        </button>
        <button
          type="button"
          onClick={() => onAdd(track)}
          disabled={selected}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 text-sm font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Plus className="size-4" />
          {selected ? "Added" : "Add"}
        </button>
      </div>
    </div>
  );
}

function LinkResult({
  item,
  subtitle,
}: {
  item: SpotifyAlbumSummary | SpotifyArtistSummary | SpotifyPlaylistSummary;
  subtitle: string;
}) {
  return (
    <a
      href={item.externalUrl}
      target="_blank"
      rel="noreferrer"
      className="group flex min-w-0 items-center gap-3 rounded-[1rem] border border-white/10 bg-white/[0.035] p-3 transition hover:border-white/18"
    >
      <AlbumArt imageUrl={item.imageUrl} name={item.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{item.name}</p>
        <p className="mt-1 truncate text-sm text-[var(--muted)]">{subtitle}</p>
      </div>
      <ExternalLink className="size-4 shrink-0 text-[var(--muted)] transition group-hover:text-white" />
    </a>
  );
}

export function SpotifyConsole() {
  const [session, setSession] = useState<SpotifySessionResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("track");
  const [results, setResults] = useState<SpotifySearchResponse>(emptySearch);
  const [searching, setSearching] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<SpotifyTrackSummary[]>([]);
  const [playlistName, setPlaylistName] = useState("GrubX Mix");
  const [playlistDescription, setPlaylistDescription] = useState("Made with GrubX.");
  const [playlistPublic, setPlaylistPublic] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [createdPlaylistUrl, setCreatedPlaylistUrl] = useState("");
  const [volume, setVolume] = useState(70);
  const [showFallback, setShowFallback] = useState(false);

  const player = useSpotifyWebPlayer(session?.accessToken ?? null, Boolean(session?.authenticated && session.accessToken));
  const premium = session?.premium === true;
  const playerReady = premium && player.ready && Boolean(player.deviceId);

  const selectedUris = useMemo(() => new Set(selectedTracks.map((track) => track.uri)), [selectedTracks]);
  const currentTrack = player.state?.track_window.current_track ?? null;

  const loadSession = useCallback(async () => {
    setSessionLoading(true);
    try {
      const response = await fetch("/api/spotify/session", { cache: "no-store" });
      const body = (await response.json()) as SpotifySessionResponse;
      setSession(body);
    } catch {
      setSession({ configured: true, authenticated: false });
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    void player.setVolume(volume / 100);
  }, [player, volume]);

  const logout = async () => {
    await fetch("/api/spotify/logout", { method: "POST", credentials: "same-origin" });
    setSession({ configured: true, authenticated: false });
    setResults(emptySearch);
    setSelectedTracks([]);
    toast.success("Spotify disconnected.");
  };

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) {
      return;
    }

    setSearching(true);
    try {
      const params = new URLSearchParams({ q: query.trim(), type: spotifyTypeParam(searchType) });
      const response = await fetch(`/api/spotify/search?${params.toString()}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as SpotifySearchResponse & { error?: string } | null;
      if (!response.ok) {
        throw new Error(body?.error ?? "Spotify search failed.");
      }
      setResults(body ?? emptySearch);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Spotify search failed.");
    } finally {
      setSearching(false);
    }
  };

  const addTrack = (track: SpotifyTrackSummary) => {
    setSelectedTracks((current) => (current.some((item) => item.uri === track.uri) ? current : [...current, track]));
  };

  const playTrack = async (track: SpotifyTrackSummary) => {
    if (!premium) {
      toast.error("Spotify Premium is required for full web playback.");
      return;
    }
    if (!player.deviceId) {
      toast.error("Spotify player is still connecting.");
      return;
    }

    try {
      await player.activate();
      const response = await fetch("/api/spotify/player/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ deviceId: player.deviceId, uri: track.uri }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(body?.error ?? "Spotify could not start playback.");
      }
      toast.success(`Playing ${track.name}`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Spotify could not start playback.");
    }
  };

  const createPlaylist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatingPlaylist(true);
    setCreatedPlaylistUrl("");

    try {
      const response = await fetch("/api/spotify/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: playlistName,
          description: playlistDescription,
          public: playlistPublic,
          uris: selectedTracks.map((track) => track.uri),
        }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string; externalUrl?: string; name?: string } | null;
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not create that playlist.");
      }
      setCreatedPlaylistUrl(body?.externalUrl ?? "");
      toast.success(`${body?.name ?? "Playlist"} created.`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not create that playlist.");
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const hasResults =
    results.tracks.length > 0 ||
    results.albums.length > 0 ||
    results.artists.length > 0 ||
    results.playlists.length > 0;

  return (
    <section className="page-shell space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <Music className="size-5 text-[var(--accent)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">Spotify</p>
          </div>
          <h1 className="mt-4 text-4xl font-bold text-white md:text-6xl">Spotify in GrubX</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Sign in, search Spotify, play from this browser with Premium, and build playlists without leaving GrubX.
          </p>
        </div>

        <div className="liquid-glass-soft rounded-[1rem] border border-white/10 p-4 lg:min-w-[320px]">
          {sessionLoading ? (
            <div className="flex min-h-16 items-center gap-3 text-sm text-[var(--muted)]">
              <Loader2 className="size-4 animate-spin" />
              Checking Spotify account...
            </div>
          ) : session?.authenticated ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">{session.user?.displayName ?? "Spotify user"}</p>
              <p className="text-xs text-[var(--muted)]">
                {premium ? "Premium web playback ready when the player connects." : "Search and playlists work. Premium is required for web playback."}
              </p>
              <button
                type="button"
                onClick={logout}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 text-sm font-semibold text-white transition active:scale-[0.98]"
              >
                <LogOut className="size-4" />
                Disconnect
              </button>
            </div>
          ) : (
            <a
              href="/api/spotify/login"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black transition active:scale-[0.98]"
            >
              <LogIn className="size-4" />
              Log in with Spotify
            </a>
          )}
        </div>
      </div>

      {session?.configured === false ? <SetupPanel redirectUri={session.setup?.redirectUri} /> : null}

      {session?.authenticated ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <div className="liquid-glass-soft rounded-[1rem] border border-white/10 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Web Player</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    {premium
                      ? playerReady
                        ? "Ready on this browser."
                        : "Connecting Spotify player..."
                      : "Spotify Premium is required for full web playback."}
                  </p>
                  {player.error ? <p className="mt-2 text-xs text-red-200">{player.error}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => player.previousTrack()}
                    disabled={!playerReady}
                    className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/10 bg-white/6 text-white disabled:opacity-40"
                    aria-label="Previous track"
                  >
                    <SkipBack className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => player.togglePlay()}
                    disabled={!playerReady}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black disabled:opacity-40"
                  >
                    {player.state?.paused === false ? <Pause className="size-4" /> : <Play className="size-4" />}
                    {player.state?.paused === false ? "Pause" : "Resume"}
                  </button>
                  <button
                    type="button"
                    onClick={() => player.nextTrack()}
                    disabled={!playerReady}
                    className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/10 bg-white/6 text-white disabled:opacity-40"
                    aria-label="Next track"
                  >
                    <SkipForward className="size-4" />
                  </button>
                  <label className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 text-sm text-white">
                    <Volume2 className="size-4" />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={volume}
                      onChange={(event) => setVolume(Number(event.target.value))}
                      className="w-24 accent-[var(--accent)]"
                    />
                  </label>
                </div>
              </div>
              {currentTrack ? (
                <div className="mt-4 flex items-center gap-3 rounded-[0.9rem] border border-white/10 bg-black/26 p-3">
                  <AlbumArt imageUrl={currentTrack.album.images?.[0]?.url} name={currentTrack.name} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{currentTrack.name}</p>
                    <p className="mt-1 truncate text-sm text-[var(--muted)]">
                      {currentTrack.artists.map((artist) => artist.name).join(", ")}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <form onSubmit={search} className="liquid-glass-soft rounded-[1rem] border border-white/10 p-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search tracks, albums, artists, or playlists..."
                    className="min-h-12 w-full rounded-full border border-white/10 bg-black/40 pl-11 pr-5 text-sm text-white outline-none placeholder:text-[var(--muted)]"
                  />
                </div>
                <select
                  value={searchType}
                  onChange={(event) => setSearchType(event.target.value as SearchType)}
                  className="min-h-12 rounded-full border border-white/10 bg-black/55 px-4 text-sm font-semibold text-white outline-none"
                >
                  {searchTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={searching}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black transition active:scale-[0.98] disabled:opacity-50"
                >
                  {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  Search
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {!hasResults ? (
                <div className="grid min-h-[280px] place-items-center rounded-[1rem] border border-white/10 bg-white/[0.03] px-6 text-center text-sm text-[var(--muted)]">
                  Search Spotify to start playing tracks or building a playlist.
                </div>
              ) : null}

              {results.tracks.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-white">Tracks</h2>
                  {results.tracks.map((track) => (
                    <TrackResult
                      key={track.id}
                      track={track}
                      premium={premium}
                      playerReady={playerReady}
                      selected={selectedUris.has(track.uri)}
                      onPlay={playTrack}
                      onAdd={addTrack}
                    />
                  ))}
                </div>
              ) : null}

              {results.albums.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-white">Albums</h2>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {results.albums.map((album) => (
                      <LinkResult key={album.id} item={album} subtitle={album.artists.join(", ") || "Album"} />
                    ))}
                  </div>
                </div>
              ) : null}

              {results.artists.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-white">Artists</h2>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {results.artists.map((artist) => (
                      <LinkResult key={artist.id} item={artist} subtitle="Artist" />
                    ))}
                  </div>
                </div>
              ) : null}

              {results.playlists.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-white">Playlists</h2>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {results.playlists.map((playlist) => (
                      <LinkResult
                        key={playlist.id}
                        item={playlist}
                        subtitle={`${playlist.owner ?? "Spotify"}${playlist.tracksTotal ? ` • ${playlist.tracksTotal} tracks` : ""}`}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="space-y-5">
            <form onSubmit={createPlaylist} className="liquid-glass-soft rounded-[1rem] border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <ListMusic className="size-5 text-[var(--accent)]" />
                <h2 className="text-lg font-bold text-white">Playlist Maker</h2>
              </div>
              <div className="mt-4 grid gap-3">
                <input
                  value={playlistName}
                  onChange={(event) => setPlaylistName(event.target.value)}
                  placeholder="Playlist name"
                  className="min-h-11 rounded-full border border-white/10 bg-black/45 px-4 text-sm text-white outline-none placeholder:text-[var(--muted)]"
                />
                <textarea
                  value={playlistDescription}
                  onChange={(event) => setPlaylistDescription(event.target.value)}
                  rows={3}
                  placeholder="Description"
                  className="resize-none rounded-[0.9rem] border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none placeholder:text-[var(--muted)]"
                />
                <label className="flex min-h-11 items-center justify-between gap-3 rounded-[0.9rem] border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white">
                  Public playlist
                  <input
                    type="checkbox"
                    checked={playlistPublic}
                    onChange={(event) => setPlaylistPublic(event.target.checked)}
                    className="size-4 accent-[var(--accent)]"
                  />
                </label>
              </div>

              <div className="mt-4 space-y-2">
                {selectedTracks.length === 0 ? (
                  <p className="rounded-[0.9rem] border border-white/10 bg-black/24 px-4 py-3 text-sm text-[var(--muted)]">
                    Add tracks from search results.
                  </p>
                ) : (
                  selectedTracks.map((track) => (
                    <div key={track.uri} className="flex items-center gap-3 rounded-[0.9rem] border border-white/10 bg-black/24 p-2">
                      <AlbumArt imageUrl={track.imageUrl} name={track.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{track.name}</p>
                        <p className="truncate text-xs text-[var(--muted)]">{track.artists.join(", ")}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTracks((current) => current.filter((item) => item.uri !== track.uri))}
                        className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/10 bg-white/6 text-[var(--muted)]"
                        aria-label={`Remove ${track.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button
                type="submit"
                disabled={creatingPlaylist || selectedTracks.length === 0}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingPlaylist ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                Create Playlist
              </button>

              {createdPlaylistUrl ? (
                <a
                  href={createdPlaylistUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/6 px-5 text-sm font-semibold text-white"
                >
                  <ExternalLink className="size-4" />
                  Open Created Playlist
                </a>
              ) : null}
            </form>

            <div className="liquid-glass-soft rounded-[1rem] border border-white/10 p-4">
              <p className="text-sm font-semibold text-white">Spotify not working? Try this instead</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Spotify web playback requires a Premium account. Audiomack is available as a fallback.
              </p>
              <button
                type="button"
                onClick={() => setShowFallback((value) => !value)}
                className={cn(
                  "mt-4 min-h-11 rounded-full px-5 text-sm font-bold transition active:scale-[0.98]",
                  showFallback ? "bg-[var(--accent)] text-black" : "bg-white text-black",
                )}
              >
                {showFallback ? "Hide Audiomack" : "Open Audiomack"}
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {showFallback ? (
        <div className="liquid-glass-soft overflow-hidden rounded-[1rem] border border-white/10 bg-white/[0.035]">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="text-sm font-semibold text-white">Spotify not working? Try this instead</p>
          </div>
          <ExternalEmbedFrame src="https://audiomack.com/" title="Audiomack fallback" className="h-[520px] w-full border-0" />
          <div className="border-t border-white/10 px-5 py-4">
            <a
              href="https://audiomack.com/"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-white underline decoration-white/30 underline-offset-4"
            >
              Open Audiomack as a link
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
