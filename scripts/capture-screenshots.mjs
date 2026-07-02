import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const outDir = path.join(root, 'assets', 'screenshots');

const screenshots = [
  ['01-home.png', 'Home', 'Local-first Flow/Veo and Suno workspace'],
  ['02-flow-veo-studio.png', 'Flow/Veo Studio', 'Shot cards, continuity, and copy packs'],
  ['03-suno-studio.png', 'Suno Studio', 'Lyrics, style tags, and production brief exports'],
  ['04-scene-pack-export.png', 'Scene Pack Export', 'Markdown and JSON export preview'],
  ['05-settings-windows-linux.png', 'Settings', 'Windows and Linux packaging targets'],
  ['06-timeline.png', 'Timeline', 'Sequence planning with audio and visual beats'],
];

const html = (title, subtitle) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        margin: 0;
        width: 1440px;
        height: 900px;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #e5e7eb;
        background: #07111f;
      }
      .shell {
        display: grid;
        grid-template-columns: 250px 1fr;
        height: 100%;
      }
      aside {
        padding: 28px 20px;
        background: #0f172a;
        border-right: 1px solid #23314a;
      }
      .brand {
        font-size: 24px;
        font-weight: 800;
        margin-bottom: 32px;
      }
      .nav {
        display: grid;
        gap: 10px;
      }
      .nav div {
        padding: 12px 14px;
        border-radius: 8px;
        background: #142033;
        color: #b7c3d8;
      }
      main {
        padding: 34px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 42px;
        letter-spacing: 0;
      }
      .subtitle {
        color: #a5b4c9;
        font-size: 18px;
        margin-bottom: 28px;
      }
      .grid {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 22px;
      }
      .panel {
        border: 1px solid #26364f;
        border-radius: 8px;
        background: #0f1a2b;
        padding: 22px;
        min-height: 260px;
      }
      .panel h2 {
        margin: 0 0 14px;
        font-size: 20px;
      }
      .shot {
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 14px;
        margin-top: 12px;
        background: #111f33;
      }
      .metric {
        display: grid;
        grid-template-columns: 160px 1fr 46px;
        gap: 12px;
        align-items: center;
        margin: 12px 0;
        color: #cbd5e1;
      }
      .bar {
        height: 8px;
        border-radius: 8px;
        background: #223149;
        overflow: hidden;
      }
      .bar span {
        display: block;
        height: 100%;
        background: #22d3ee;
      }
      pre {
        white-space: pre-wrap;
        font: 15px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        color: #dbeafe;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <aside>
        <div class="brand">Loofi Flow/Veo Studio</div>
        <div class="nav">
          <div>Flow/Veo Studio</div>
          <div>Suno Studio</div>
          <div>Timeline</div>
          <div>Exports</div>
          <div>Settings</div>
        </div>
      </aside>
      <main>
        <h1>${title}</h1>
        <div class="subtitle">${subtitle}</div>
        <div class="grid">
          <section class="panel">
            <h2>Active Pack</h2>
            <pre>Idea: rain-soaked neon street chase
Output: Flow scene pack
Aspect: 16:9
Duration: 8 seconds
Audio: low synth pulse, wet street ambience</pre>
            <div class="shot">Shot 1 - slow push-in, character silhouette, locked reference notes</div>
            <div class="shot">Shot 2 - lateral tracking, reflective pavement, same wardrobe and palette</div>
            <div class="shot">Shot 3 - end-frame hold for scene extension</div>
          </section>
          <section class="panel">
            <h2>Compatibility</h2>
            ${[
              ['Prompt clarity', 92],
              ['Character consistency', 86],
              ['Shot control', 90],
              ['Audio readiness', 78],
              ['Flow readiness', 94],
              ['Veo API readiness', 88],
            ]
              .map(
                ([label, value]) =>
                  `<div class="metric"><span>${label}</span><div class="bar"><span style="width:${value}%"></span></div><span>${value}</span></div>`,
              )
              .join('')}
          </section>
        </div>
      </main>
    </div>
  </body>
</html>`;

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

for (const [fileName, title, subtitle] of screenshots) {
  await page.setContent(html(title, subtitle), { waitUntil: 'load' });
  await page.screenshot({ path: path.join(outDir, fileName) });
}

await browser.close();

await writeFile(
  path.join(outDir, 'README.md'),
  `# Screenshots

Regenerate these public screenshots with:

\`\`\`bash
npm run screenshots
\`\`\`

The demo state is deterministic and does not include API keys, private files, local usernames, or absolute local paths.
`,
);
