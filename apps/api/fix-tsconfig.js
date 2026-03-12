const fs = require('fs');
let tsconfig = fs.readFileSync('tsconfig.json', 'utf8');
tsconfig = tsconfig.replace('"outDir": "./dist"', '"outDir": "./dist",\n    "rootDir": "./src"');
fs.writeFileSync('tsconfig.json', tsconfig);
console.log('done');
