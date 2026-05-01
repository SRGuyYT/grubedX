import type { GrubXAccount, GrubXWatchHistoryItem, GrubXWatchProgress } from "@/types/grubx";

const ACCOUNT_STORAGE_KEY = "grubx_account";

const DEFAULT_ACCOUNT: GrubXAccount = {
  userId: "local",
  favorites: [],
  watchHistory: [],
  settings: {},
  lastWatched: {},
};

const readAccount = (): GrubXAccount => {
  if (typeof window === "undefined") {
    return DEFAULT_ACCOUNT;
  }

  try {
    const raw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
    return raw ? { ...DEFAULT_ACCOUNT, ...JSON.parse(raw) } : DEFAULT_ACCOUNT;
  } catch {
    return DEFAULT_ACCOUNT;
  }
};

const writeAccount = (account: GrubXAccount) => {
  if (typeof window === "undefined") {
    return account;
  }

  window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  return account;
};

export const saveWatchProgress = (progress: Omit<GrubXWatchProgress, "updatedAt">) => {
  const account = readAccount();
  const updated: GrubXWatchProgress = {
    ...progress,
    updatedAt: new Date().toISOString(),
  };
  const historyItem: GrubXWatchHistoryItem = {
    ...updated,
    progress: updated.duration > 0 ? Math.round((updated.currentTime / updated.duration) * 100) : 0,
  };

  return writeAccount({
    ...account,
    lastWatched: {
      ...account.lastWatched,
      [progress.id]: updated,
    },
    watchHistory: [
      historyItem,
      ...account.watchHistory.filter((item) => item.id !== progress.id),
    ].slice(0, 100),
  });
};

export const getWatchHistory = () => readAccount().watchHistory;

export const toggleFavorite = (id: string) => {
  const account = readAccount();
  const favorites = account.favorites.includes(id)
    ? account.favorites.filter((favoriteId) => favoriteId !== id)
    : [id, ...account.favorites];

  return writeAccount({
    ...account,
    favorites,
  });
};
