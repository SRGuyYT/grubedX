const readClientEnv = (name: string) => {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
};

const requireClientEnv = (name: string) => {
  const value = readClientEnv(name);
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
};

export const env = {
  tmdbProxyBase: requireClientEnv("NEXT_PUBLIC_TMDB_PROXY_BASE"),
  tmdbApiKey: requireClientEnv("NEXT_PUBLIC_TMDB_API_KEY"),
  vidkingBase: requireClientEnv("NEXT_PUBLIC_VIDKING_BASE"),
  firebaseApiKey: requireClientEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
  firebaseAuthDomain: requireClientEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  firebaseProjectId: requireClientEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  firebaseStorageBucket: requireClientEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  firebaseMessagingSenderId: requireClientEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  firebaseAppId: requireClientEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  firebaseMeasurementId: requireClientEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"),
  useFirebaseAuthEmulator: readClientEnv("NEXT_PUBLIC_USE_FIREBASE_AUTH_EMULATOR") === "true",
  firebaseAuthEmulatorUrl: readClientEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL") || "http://127.0.0.1:9099",
  matrixBridgeEnabled: readClientEnv("NEXT_PUBLIC_MATRIX_BRIDGE_ENABLED") === "true",
};

export const readServerEnv = (name: string) => {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
};
