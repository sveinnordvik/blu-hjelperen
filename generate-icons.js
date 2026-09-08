import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

async function generateIcons() {
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, 'public');

  // Find source file - check common names
  const possibleSources = [
    'BLUlogo.png',
    'input_file_0.png',
    'logo-source.png'
  ];

  let sourcePath = null;
  const files = fs.readdirSync(rootDir);
  
  for (const name of possibleSources) {
    if (files.includes(name)) {
      sourcePath = path.join(rootDir, name);
      console.log(`Found source image: ${name}`);
      break;
    }
  }

  // If not found in filenames, look for any PNG that might be the source
  if (!sourcePath) {
    const pngFiles = files.filter(f => f.toLowerCase().endsWith('.png') && !f.includes('android-chrome') && !f.includes('apple-touch-icon'));
    if (pngFiles.length > 0) {
      sourcePath = path.join(rootDir, pngFiles[0]);
      console.log(`Using potential source image: ${pngFiles[0]}`);
    }
  }

  if (!sourcePath) {
    console.error('Source image not found in root directory.');
    process.exit(1);
  }

  const image = await Jimp.read(sourcePath);

  const targets = [
    { name: 'favicon.ico', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 }
  ];

  for (const target of targets) {
    const resized = image.clone().resize({ w: target.size, h: target.size });
    const destPath = path.join(publicDir, target.name);
    await resized.write(destPath);
    console.log(`Generated: ${target.name} (${target.size}x${target.size})`);
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
