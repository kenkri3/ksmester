## 2024-05-24 - Extracted expensive inline filtering out of Dashboard render
**Learning:** Found multiple instances where large arrays (`offers`, `projects`) were being heavily filtered directly inside the render cycle, which could lead to significant performance degradation as these lists grow.
**Action:** Always utilize `useMemo` hooks to extract repeated array derivations (`.filter`, `.reduce`, mapping logic) out of render functions in large React components, especially heavily-used dashboard interfaces. Make sure zero-state checks also utilize the memoized variables.

## 2025-03-05 - Avoided duplicated state from custom hooks
**Learning:** Found an anti-pattern in `Dashboard.tsx` where data returned from a custom hook (`useDashboardData`) was being mirrored into local `useState` via a `useEffect` hook. This pattern causes double-rendering: one when the hook updates, and a second when the `useEffect` triggers the local state update.
**Action:** When pulling data from custom hooks or context, use the returned values directly in the component body instead of duplicating them into local `useState`, unless local optimistic updates are specifically required.
