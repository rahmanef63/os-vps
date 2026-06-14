// Small LRU keyed on (lang, hash(code)) for the highlight() façade. Pairs
// with React's `useDeferredValue` in the editor surface: bursts of keystrokes
// produce repeated intermediate states (e.g. after a backspace) which we
// reuse instead of re-tokenizing.

const LRU_LIMIT = 16;
const lru = new Map<string, string>();

export function lruGet(k: string): string | undefined {
  const v = lru.get(k);
  if (v !== undefined) {
    lru.delete(k);
    lru.set(k, v);
  }
  return v;
}

export function lruSet(k: string, v: string) {
  if (lru.has(k)) lru.delete(k);
  lru.set(k, v);
  if (lru.size > LRU_LIMIT) {
    const first = lru.keys().next().value;
    if (first !== undefined) lru.delete(first);
  }
}

// djb2-style hash; cheap + collision-resistant enough for cache invalidation.
export function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h.toString(36);
}

// Test hook: bumped every time a per-line / full-body tokenizer fires. Lets
// the test assert that incremental edits only re-tokenize the changed lines.
export const __cacheStats = { lineTokenizations: 0, bodyTokenizations: 0 };

export function resetStats() {
  __cacheStats.lineTokenizations = 0;
  __cacheStats.bodyTokenizations = 0;
}
