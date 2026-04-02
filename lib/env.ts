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
  firebaseApiKey: requireEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, "NEXT_PUBLIC_FIREBASE_API_KEY"),
  firebaseAuthDomain: requireEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  firebaseProjectId: requireEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, "NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  firebaseStorageBucket: requireEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  firebaseMessagingSenderId: requireEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  firebaseAppId: requireEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, "NEXT_PUBLIC_FIREBASE_APP_ID"),
  firebaseMeasurementId: requireEnv(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"),
  useFirebaseAuthEmulator: process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH_EMULATOR === "true",
  firebaseAuthEmulatorUrl: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL || "http://127.0.0.1:9000",
  matrixBridgeEnabled: process.env.NEXT_PUBLIC_MATRIX_BRIDGE_ENABLED === "true",
};

export const readServerEnv = (name: string) => {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
};
