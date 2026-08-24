## 2024-05-24 - Extracted expensive inline filtering out of Dashboard render
**Learning:** Found multiple instances where large arrays (`offers`, `projects`) were being heavily filtered directly inside the render cycle, which could lead to significant performance degradation as these lists grow.
**Action:** Always utilize `useMemo` hooks to extract repeated array derivations (`.filter`, `.reduce`, mapping logic) out of render functions in large React components, especially heavily-used dashboard interfaces. Make sure zero-state checks also utilize the memoized variables.
