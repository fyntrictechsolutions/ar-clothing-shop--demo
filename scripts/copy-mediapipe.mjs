// Copies MediaPipe's WebAssembly runtime into public/ so the app serves it
// from its own domain (no CDN needed at runtime).
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const src = join('node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const dest = join('public', 'mediapipe', 'wasm');
mkdirSync(dest, { recursive: true });
for (const file of readdirSync(src)) {
  if (file.startsWith('vision_wasm_internal') || file.startsWith('vision_wasm_nosimd_internal')) {
    cpSync(join(src, file), join(dest, file));
  }
}
console.log(`MediaPipe wasm copied to ${dest}`);
