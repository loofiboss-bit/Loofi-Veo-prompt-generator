import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

const FONT_SHA256 = {
  'LICENSE-APACHE.txt': 'c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4',
  'LICENSE-OFL.txt': '6a73f9541c2de74158c0e7cf6b0a58ef774f5a780bf191f2d7ec9cc53efe2bf2',
  'NotoSansArabic.ttf': '3fae4d7239d1faa55b234bda8091019a5251ff79df40d5e29367d84bed2a8138',
  'NotoSansCJK.ttc': 'd3d8256cdec8dbcb3552284bc6b20c734dd60c2ee9df83b5758e34807c4bac32',
  'NotoSans.ttf': 'fb53504de62e767a54695416123d68d67f71c9b69722175184ad56e7dd13547b',
  'NotoSerif.ttf': '9374c4d81d2e21b03ac03fbc165458e8cf63e434a44c82193aa0305d20dc1037',
  'README.md': '7e227f4477bdbd377c11557755c5e24e9b95699a1849e0bffe79c841fd49f4c5',
};

async function sha256File(filePath) {
  const bytes = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

export async function verifyCreatorAssets(repoRoot = root) {
  const fontsDir = path.join(repoRoot, 'public', 'creator-fonts');
  for (const [filename, expected] of Object.entries(FONT_SHA256)) {
    const actual = await sha256File(path.join(fontsDir, filename));
    if (actual !== expected) {
      throw new Error(
        `Creator font checksum mismatch for public/creator-fonts/${filename}: expected ${expected}, got ${actual}`,
      );
    }
  }

  const examplesDir = path.join(repoRoot, 'public', 'creator-examples');
  const rights = JSON.parse(await fs.readFile(path.join(examplesDir, 'rights.json'), 'utf8'));
  for (const entry of rights.assets || []) {
    const actual = await sha256File(path.join(examplesDir, entry.file));
    if (actual !== entry.sha256) {
      throw new Error(
        `Creator example checksum mismatch for public/creator-examples/${entry.file}: expected ${entry.sha256}, got ${actual}`,
      );
    }
  }

  return {
    fontsVerified: Object.keys(FONT_SHA256).length,
    examplesVerified: (rights.assets || []).length,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const summary = await verifyCreatorAssets();
  console.log(
    `Verified ${summary.fontsVerified} bundled fonts and ${summary.examplesVerified} creator examples (SHA-256).`,
  );
}
