const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "../dist");
const dst = path.join(__dirname, "../../src-tauri/runtime/backend/static/dist");

function copiarDir(origen, destino) {
  fs.mkdirSync(destino, { recursive: true });
  for (const entry of fs.readdirSync(origen, { withFileTypes: true })) {
    const srcPath = path.join(origen, entry.name);
    const dstPath = path.join(destino, entry.name);
    if (entry.isDirectory()) {
      copiarDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

copiarDir(src, dst);
console.log(`✓ dist copiado a ${dst}`);