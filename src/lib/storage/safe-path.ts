import path from "path";

/**
 * Resolve `segments` under `baseDir`, returning the absolute path only if
 * it stays inside `baseDir`. Returns `null` for any traversal escape.
 *
 * Unlike a raw `resolved.startsWith(baseDir)` check, this rejects sibling
 * directories that merely share `baseDir` as a string prefix — e.g. with
 * base `/app/uploads`, the input `../uploads-old/x` resolves to
 * `/app/uploads-old/x`, which starts with `/app/uploads` but is NOT inside
 * it. Comparing against `baseDir + path.sep` closes that gap. Absolute
 * segments and `..` escapes are likewise rejected.
 */
export function resolveWithinDir(
  baseDir: string,
  ...segments: string[]
): string | null {
  const base = path.resolve(baseDir);
  const resolved = path.resolve(base, ...segments);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    return null;
  }
  return resolved;
}
