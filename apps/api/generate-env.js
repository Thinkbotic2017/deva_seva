const fs = require('fs');
const crypto = require('crypto');

const privateKey = fs.readFileSync('private.pem', 'utf8').replace(/\n/g, '\\n');
const publicKey = fs.readFileSync('public.pem', 'utf8').replace(/\n/g, '\\n');
const encKey = crypto.randomBytes(32).toString('hex');

const env = [
  'NODE_ENV=development',
  'PORT=3000',
  'API_PREFIX=api/v1',
  '',
  'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/devaseva',
  'REDIS_URL=redis://localhost:6379',
  '',
  `JWT_PRIVATE_KEY="${privateKey}"`,
  `JWT_PUBLIC_KEY="${publicKey}"`,
  'JWT_ACCESS_EXPIRES_IN=15m',
  'JWT_REFRESH_EXPIRES_IN=30d',
  '',
  `ENCRYPTION_KEY=${encKey}`,
  '',
  'RAZORPAY_KEY_ID=rzp_test_dummy',
  'RAZORPAY_KEY_SECRET=dummy',
  '',
  'AWS_REGION=ap-south-1',
  'AWS_BUCKET_NAME=devaseva-dev',
  'AWS_ACCESS_KEY_ID=dummy',
  'AWS_SECRET_ACCESS_KEY=dummy',
  '',
  'GUPSHUP_API_KEY=dummy',
  'GUPSHUP_SOURCE_NUMBER=dummy',
  'GUPSHUP_APP_NAME=dummy',
].join('\n');

fs.writeFileSync('.env', env);
console.log('.env written successfully');
console.log('ENCRYPTION_KEY:', encKey);
