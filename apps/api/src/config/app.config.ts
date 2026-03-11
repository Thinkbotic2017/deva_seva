import { registerAs } from '@nestjs/config';

/** Application-level configuration. Loaded once at startup. */
export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  apiUrl: process.env['API_URL'] ?? 'http://localhost:3001',
  adminUrl: process.env['ADMIN_URL'] ?? 'http://localhost:3000',
  webUrl: process.env['WEB_URL'] ?? 'http://localhost:3002',
}));
