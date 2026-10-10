import { parsePlc, readDocStreams, readGrpprl } from 'doc-codec';
import type { DocumentGrid } from './types.js';

/**
 * Sepx 中与「文档网格」相关的 sprm（复杂套表实测）：
 * - 0x5032：sprmSClm 网格模式（1=行+字符网格）
 * - 0x9031：sprmSDyaLinePitch 行距（twips）→ 如 585 = 29.25pt
 * - 0x7030：sprmSDxtCharSpace 字符网格相对 Normal 字号的增量（单位 4096/pt）
 *
 * doc-codec 的 readAllSectionProperties 不解析这些字段。
 */
const SPRM_S_CLM_LIKE = 0x5032;
const SPRM_S_DYA_LINE_PITCH = 0x9031;
const SPRM_S_DXT_CHAR_SPACE = 0x7030;
const TWIPS_PER_PT = 20;
const DXT_PER_PT = 4096;

function readU16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function readU32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]!
    | (bytes[offset + 1]! << 8)
    | (bytes[offset + 2]! << 16)
    | (bytes[offset + 3]! << 24)
  ) >>> 0;
}

function readI32LE(bytes: Uint8Array, offset: number): number {
  const u = readU32LE(bytes, offset);
  return u > 0x7fffffff ? u - 0x100000000 : u;
}

/**
 * 从 .doc 字节读取各节文档网格行距。
 * 与 ContentSection 顺序对齐；无网格时对应项为 undefined。
 */
export function readDocumentGrids(
  input: Uint8Array,
  password?: string,
): (DocumentGrid | undefined)[] {
  // doc-codec 类型要 ArrayBuffer 具体缓冲；调用方常是 ArrayBufferLike
  const streams = readDocStreams(
    input as Uint8Array<ArrayBuffer>,
    password,
  );
  const { wordDocument, table, fib } = streams as {
    wordDocument: Uint8Array;
    table: Uint8Array;
    fib: {
      fcPlcfSed?: number;
      lcbPlcfSed?: number;
    };
  };

  const lcb = fib.lcbPlcfSed ?? 0;
  const fc = fib.fcPlcfSed ?? 0;
  if (lcb <= 0) return [undefined];

  const plc = parsePlc(table.subarray(fc, fc + lcb), 12, 'PlcfSed');
  const out: (DocumentGrid | undefined)[] = [];

  for (let i = 0; i < plc.count; i++) {
    const sed = plc.element(i) as Uint8Array;
    const fcSepx = readU32LE(sed, 2);
    const cb = readU16LE(wordDocument, fcSepx);
    const grpprl = wordDocument.subarray(fcSepx + 2, fcSepx + 2 + cb);
    let linePitchPt: number | undefined;
    let clm: number | undefined;
    let charPitchDeltaPt: number | undefined;

    for (const prl of readGrpprl(grpprl)) {
      const sprm = prl.sprm.value as number;
      if (sprm === SPRM_S_DYA_LINE_PITCH && prl.operand.length >= 2) {
        const twips = readU16LE(prl.operand, 0);
        if (twips > 0) linePitchPt = twips / TWIPS_PER_PT;
      }
      if (sprm === SPRM_S_CLM_LIKE && prl.operand.length >= 2) {
        clm = readU16LE(prl.operand, 0);
      }
      if (sprm === SPRM_S_DXT_CHAR_SPACE && prl.operand.length >= 4) {
        charPitchDeltaPt = readI32LE(prl.operand, 0) / DXT_PER_PT;
      }
    }

    // clm=0 且无 pitch → 无网格；有 pitch 则采用（常见：clm=1 + pitch=29.25pt）
    if (linePitchPt != null && linePitchPt > 0) {
      out.push({
        linePitchPt,
        clm,
        charPitchDeltaPt,
      });
    } else {
      out.push(undefined);
    }
  }

  return out.length ? out : [undefined];
}
