import { describe, expect, it } from 'vitest';
import { colorToCss } from './mapFromDocCodec.js';

describe('colorToCss', () => {
  it('maps doc-codec unit RGB (0–1) to hex', () => {
    expect(colorToCss({ r: 1, g: 0, b: 0 })).toBe('#ff0000');
    expect(colorToCss({ r: 0, g: 0, b: 0 })).toBe('#000000');
    expect(colorToCss({ r: 0, g: 0, b: 1 })).toBe('#0000ff');
    expect(colorToCss({ r: 1, g: 1, b: 1 })).toBe('#ffffff');
  });

  it('still accepts 0–255 channel values', () => {
    expect(colorToCss({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
    expect(colorToCss({ r: 128, g: 64, b: 32 })).toBe('#804020');
  });

  it('passes through #hex strings', () => {
    expect(colorToCss('#abc')).toBe('#abc');
  });
});
