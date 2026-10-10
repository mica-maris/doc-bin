/** 公文常见字体 → 浏览器可回退栈（本机有原字体则优先） */
const FONT_FALLBACKS: Record<string, string[]> = {
  // 本机常见无「文鼎大标宋」：优先华文中宋（衬线标宋感），避免落到黑体/雅黑
  文鼎大标宋简: ['华文中宋', '华文宋体', '方正小标宋简体', '宋体', 'SimSun'],
  方正小标宋简体: ['华文中宋', '华文宋体', '宋体', 'SimSun'],
  楷体_GB2312: ['楷体', '华文楷体', 'KaiTi', 'STKaiti'],
  仿宋_GB2312: ['仿宋', '华文仿宋', 'FangSong', 'STFangsong', '宋体'],
  黑体: ['SimHei', 'Microsoft YaHei', '微软雅黑', 'sans-serif'],
  宋体: ['SimSun', '宋体', '华文宋体', 'NSimSun', 'serif'],
  'Times New Roman': ['Times New Roman', 'Times', 'serif'],
};

export function cssFontFamily(fontFamily?: string): string | undefined {
  if (!fontFamily) return undefined;
  const name = fontFamily.replace(/"/g, '').trim();
  if (!name) return undefined;
  const extras = FONT_FALLBACKS[name] ?? ['宋体', 'SimSun', 'serif'];
  const stack = [name, ...extras.filter((f) => f !== name)];
  return stack.map((f) => (/[\s_]/.test(f) || /[^\w]/.test(f) ? `"${f}"` : f)).join(', ');
}

export type CoverRole = 'title' | 'field' | 'issuer' | 'other';

export function coverParagraphRole(text: string): CoverRole {
  const t = text.replace(/\s+/g, '');
  if (/申请表|登记表/.test(t)) return 'title';
  if (/监制/.test(t)) return 'issuer';
  if (/工会名称|填报时间/.test(t)) return 'field';
  return 'other';
}

/**
 * doc-codec 不暴露字符间距；对标 WPS 封面目视字距（pt）。
 * 缺「文鼎大标宋」时靠字距+中宋回退贴近大标宋排法。
 */
export function coverLetterSpacingPt(
  role: CoverRole,
  fontFamily: string | undefined,
  text: string,
): number | undefined {
  const t = text.replace(/\s+/g, '');
  if (!t) return undefined;
  if (role === 'title') return 12;
  if (role === 'issuer') return 18;
  // 填空行（名称/时间）：禁止加字距——会与首行缩进+下划线空格叠出换行错乱
  if (role === 'field') return undefined;
  const font = fontFamily ?? '';
  if (/标宋/.test(font)) return 12;
  return undefined;
}
