/**
 * UTF-8 byte length of a string.
 *
 * The Files panel labels its size column "B", so it has to agree with what
 * `os.path.getsize()` reports inside a playground runtime. JavaScript's
 * `String.length` counts UTF-16 code units, which understates every file
 * containing accented text, CJK or emoji (`é` is 1 unit but 2 bytes, `你` is
 * 1 unit but 3, `😀` is 2 units but 4).
 *
 * Counted rather than encoded: this runs on every keystroke for the open
 * buffers, and `new TextEncoder().encode(s).length` would allocate a copy of
 * the whole document each time.
 */
export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        // Surrogate pair: one astral code point, 4 bytes.
        bytes += 4;
        i += 1;
        continue;
      }
      // Lone surrogate; encoders emit U+FFFD, which is 3 bytes.
      bytes += 3;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}
