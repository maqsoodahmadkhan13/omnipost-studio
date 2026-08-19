/**
 * Structured logger utility
 * Follows strict security rules: Never logs passwords, tokens, or private keys.
 */

const formatTimestamp = () => new Date().toISOString();

const sanitize = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveKeys = [
    'password',
    'passwordHash',
    'accessToken',
    'refreshToken',
    'token',
    'secret',
    'jwtSecret',
    'privateKey',
    'authorization'
  ];

  const cleaned = Array.isArray(data) ? [...data] : { ...data };

  for (const key in cleaned) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
      cleaned[key] = sanitize(cleaned[key]);
    }
  }

  return cleaned;
};

export const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] [${formatTimestamp()}] ${message}`, Object.keys(meta).length ? JSON.stringify(sanitize(meta)) : '');
  },
  warn: (message, meta = {}) => {
    console.warn(`[WARN] [${formatTimestamp()}] ${message}`, Object.keys(meta).length ? JSON.stringify(sanitize(meta)) : '');
  },
  error: (message, meta = {}) => {
    console.error(`[ERROR] [${formatTimestamp()}] ${message}`, Object.keys(meta).length ? JSON.stringify(sanitize(meta)) : '');
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] [${formatTimestamp()}] ${message}`, Object.keys(meta).length ? JSON.stringify(sanitize(meta)) : '');
    }
  }
};
