import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const svgPath = join(publicDir, 'favicon.svg');
const svgBuffer = readFileSync(svgPath);

// apple-touch-icon.png (180x180)
await sharp(svgBuffer).resize(180, 180).png().toFile(join(publicDir, 'apple-touch-icon.png'));
console.log('Created apple-touch-icon.png (180x180)');

// favicon.ico — 32x32 PNG wrapped as ICO
const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();

const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);

const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(32, 0);
icoEntry.writeUInt8(32, 1);
icoEntry.writeUInt8(0, 2);
icoEntry.writeUInt8(0, 3);
icoEntry.writeUInt16LE(1, 4);
icoEntry.writeUInt16LE(32, 6);
icoEntry.writeUInt32LE(png32.length, 8);
icoEntry.writeUInt32LE(22, 12);

writeFileSync(join(publicDir, 'favicon.ico'), Buffer.concat([icoHeader, icoEntry, png32]));
console.log('Created favicon.ico (32x32)');
