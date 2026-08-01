import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/shared/styles/tokens.css'), 'utf8');

function hexToLuminance(hex: string): number {
  const channels = [1, 3, 5].map(
    (offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = hexToLuminance(foreground);
  const backgroundLuminance = hexToLuminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

function themeBlock(selector: string): string {
  const escapedSelector = selector.replaceAll('[', '\\[').replaceAll(']', '\\]');
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`));
  if (!match?.[1]) throw new Error(`Missing ${selector} token block.`);
  return match[1];
}

function token(block: string, name: string): string {
  const match = block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match?.[1]) throw new Error(`Missing --${name} token.`);
  return match[1];
}

describe('creator surface contrast tokens', () => {
  it('keeps primary and secondary text at WCAG AA contrast in light and dark themes', () => {
    const light = themeBlock(':root');
    const dark = themeBlock("[data-theme='dark']");

    for (const block of [light, dark]) {
      const background = token(block, 'color-bg-primary');
      expect(contrastRatio(token(block, 'color-text-primary'), background)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        contrastRatio(token(block, 'color-text-secondary'), background),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps white primary-action text readable on signal blue', () => {
    const light = themeBlock(':root');
    expect(contrastRatio('#ffffff', token(light, 'color-primary-600'))).toBeGreaterThanOrEqual(4.5);
  });
});
