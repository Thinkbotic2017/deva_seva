const fs = require('fs');
let config = fs.readFileSync('vite.config.ts', 'utf8');
config = config
  .replace('port: 3000,', 'port: 5173,')
  .replace("target: 'http://localhost:3001'", "target: 'http://localhost:3000'");
fs.writeFileSync('vite.config.ts', config);
console.log('done');
