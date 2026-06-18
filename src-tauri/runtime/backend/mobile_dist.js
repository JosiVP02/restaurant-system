// mobile/scripts/copy-dist.js
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'dist');
const DEST = path.join(__dirname, '..', '..', 'src-tauri', 'runtime', 'backend', 'mobile_dist');

if (!fs.existsSync(SRC)) {
  console.error('No se encontró mobile/dist. Corre "npm run build" primero.');
  process.exit(1);
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.cpSync(SRC, DEST, { recursive: true });
console.log(`Copiado mobile/dist -> ${DEST}`);