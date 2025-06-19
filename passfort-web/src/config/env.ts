// Environment Configuration for PassFort

export const config = {
  // API Configuration
  apiUrl: import.meta.env.VITE_API_URL || '/api',

  // Application Configuration
  appName: import.meta.env.VITE_APP_NAME || 'PassFort',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',

  // Security Configuration
  crypto: {
    iterations: parseInt(import.meta.env.VITE_CRYPTO_ITERATIONS || '100000'),
    memory: parseInt(import.meta.env.VITE_CRYPTO_MEMORY || '64'),
    parallelism: parseInt(import.meta.env.VITE_CRYPTO_PARALLELISM || '1'),
  },

  // PWA Configuration
  pwa: {
    enabled: import.meta.env.VITE_PWA_ENABLED === 'true',
  },

  // Development flags
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const; 