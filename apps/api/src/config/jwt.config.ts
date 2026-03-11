import { registerAs } from '@nestjs/config';

/** JWT (RS256) configuration. Keys are PEM strings from environment. */
export const jwtConfig = registerAs('jwt', () => ({
  privateKey: (process.env['JWT_PRIVATE_KEY'] ?? '').replace(/\\n/g, '\n'),
  publicKey: (process.env['JWT_PUBLIC_KEY'] ?? '').replace(/\\n/g, '\n'),
  accessExpiry: parseInt(process.env['JWT_ACCESS_EXPIRY'] ?? '900', 10),
  refreshExpiry: parseInt(process.env['JWT_REFRESH_EXPIRY'] ?? '2592000', 10),
}));
