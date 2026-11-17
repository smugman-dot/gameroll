export type RGB = [number, number, number]; // each 0–255

export interface Palette {
  accent: RGB;
  lo: RGB;
  hi: RGB;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const hh = (((h % 360) + 360) % 360) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [Math.round(f(hh + 1 / 3) * 255), Math.round(f(hh) * 255), Math.round(f(hh - 1 / 3) * 255)];
}

export function paletteFromHue(h: number, s = 0.65): Palette {
  return {
    accent: hslToRgb(h, clamp(s + 0.1, 0, 1), 0.62),
    lo: hslToRgb(h, s, 0.32),
    hi: hslToRgb(h, s * 0.55, 0.86),
  };
}

export function paletteFromHex(hex: string): Palette {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return DEFAULT_PALETTE;
  const n = parseInt(m[1], 16);
  const [h, s] = rgbToHsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
  return paletteFromHue(h, clamp(s, 0.4, 0.9));
}

export function hueFromString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return 235 + (h % 70);
}

export const DEFAULT_PALETTE: Palette = paletteFromHue(250, 0.6);

export function extractPalette(src: string): Promise<Palette | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => resolve(null);
    img.onload = () => {
      try {
        const N = 24;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = N;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, N, N);
        const { data } = ctx.getImageData(0, 0, N, N);

        const bins = new Float32Array(36);
        const sat = new Float32Array(36);
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 200) continue;
          const [h, s] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
          const v = Math.max(data[i], data[i + 1], data[i + 2]) / 255;
          if (s < 0.18 || v < 0.18) continue;
          const w = s * s * v;
          const b = Math.floor(h / 10) % 36;
          bins[b] += w;
          sat[b] += w * s;
        }

        let best = 0;
        let bestScore = 0;
        for (let b = 0; b < 36; b++) {
          const score = bins[b] + 0.5 * (bins[(b + 35) % 36] + bins[(b + 1) % 36]);
          if (score > bestScore) {
            bestScore = score;
            best = b;
          }
        }
        if (bins[best] < 0.05) return resolve(paletteFromHue(250, 0.15));

        resolve(paletteFromHue(best * 10 + 5, clamp(sat[best] / bins[best], 0.45, 0.9)));
      } catch {
        resolve(null);
      }
    };
    img.src = src;
  });
}
