const requireEnv = (value: string | undefined, name: string) => {
  if (!value || value.trim().length === 0) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
};

export const env = {
  tmdbProxyBase: requireEnv(process.env.NEXT_PUBLIC_TMDB_PROXY_BASE, "NEXT_PUBLIC_TMDB_PROXY_BASE"),
  tmdbApiKey: requireEnv(process.env.NEXT_PUBLIC_TMDB_API_KEY, "NEXT_PUBLIC_TMDB_API_KEY"),
  vidkingBase: requireEnv(process.env.NEXT_PUBLIC_VIDKING_BASE, "NEXT_PUBLIC_VIDKING_BASE"),
};

export const readServerEnv = (name: string) => {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
};
