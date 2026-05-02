const requireEnv = (value: string | undefined, name: string) => {
  if (!value || value.trim().length === 0) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
};

const optionalEnv = (value: string | undefined, fallback: string) => {
  return value && value.trim().length > 0 ? value : fallback;
};

export const env = {
  tmdbProxyBase: requireEnv(process.env.NEXT_PUBLIC_TMDB_PROXY_BASE, "NEXT_PUBLIC_TMDB_PROXY_BASE"),
  tmdbApiKey: requireEnv(process.env.NEXT_PUBLIC_TMDB_API_KEY, "NEXT_PUBLIC_TMDB_API_KEY"),
  vidkingBase: optionalEnv(process.env.NEXT_PUBLIC_VIDKING_BASE, "https://www.vidking.net/embed"),
};

export const readServerEnv = (name: string) => {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
};
