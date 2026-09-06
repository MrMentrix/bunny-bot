const REGIONAL_INDICATOR_BASE = 0x1f1e6; // 🇦

export function letterEmoji(index) {
  return String.fromCodePoint(REGIONAL_INDICATOR_BASE + index);
}

export function emojiToLetterIndex(emoji) {
  const code = emoji?.codePointAt(0);
  if (code === undefined) return -1;
  const index = code - REGIONAL_INDICATOR_BASE;
  return index >= 0 && index < 26 ? index : -1;
}
