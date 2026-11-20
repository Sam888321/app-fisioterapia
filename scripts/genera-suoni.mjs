// Genera i due suoni dell'app: node scripts/genera-suoni.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const RATE = 44100;

function toni(note) {
  const campioni = [];
  for (const [freq, ms] of note) {
    const n = Math.round((RATE * ms) / 1000);
    const rampa = Math.round(RATE * 0.005); // 5 ms: niente click
    for (let i = 0; i < n; i++) {
      const env = Math.min(1, i / rampa, (n - 1 - i) / rampa);
      campioni.push(Math.sin((2 * Math.PI * freq * i) / RATE) * env * 0.8);
    }
  }
  return campioni;
}

function wav(campioni) {
  const b = Buffer.alloc(44 + campioni.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + campioni.length * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(RATE, 24); b.writeUInt32LE(RATE * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(campioni.length * 2, 40);
  campioni.forEach((c, i) => b.writeInt16LE(Math.round(c * 32767), 44 + i * 2));
  return b;
}

mkdirSync('assets/suoni', { recursive: true });
writeFileSync('assets/suoni/cambio.wav', wav(toni([[880, 150]])));
writeFileSync('assets/suoni/fine.wav', wav(toni([[660, 180], [880, 180], [1100, 180]])));
console.log('ok');
