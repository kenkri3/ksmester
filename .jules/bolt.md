## 2024-05-24 - Extracted expensive inline filtering out of Dashboard render
**Learning:** Found multiple instances where large arrays (`offers`, `projects`) were being heavily filtered directly inside the render cycle, which could lead to significant performance degradation as these lists grow.
**Action:** Always utilize `useMemo` hooks to extract repeated array derivations (`.filter`, `.reduce`, mapping logic) out of render functions in large React components, especially heavily-used dashboard interfaces. Make sure zero-state checks also utilize the memoized variables.

## 2025-03-05 - Avoided duplicated state from custom hooks
**Learning:** Found an anti-pattern in `Dashboard.tsx` where data returned from a custom hook (`useDashboardData`) was being mirrored into local `useState` via a `useEffect` hook. This pattern causes double-rendering: one when the hook updates, and a second when the `useEffect` triggers the local state update.
**Action:** When pulling data from custom hooks or context, use the returned values directly in the component body instead of duplicating them into local `useState`, unless local optimistic updates are specifically required.

## 2026-08-27 - Unmemoized derived objects in custom hooks
**Learning:** Discovered an anti-pattern in `useDashboardData.ts` where derived data structures (`stats` object, `recentDeviations` array) were being computed on every render and returned as unstable object/array references. This forces any component consuming the hook to undergo a re-render cascade, and repeats unnecessary O(N) array filtering calculations.
**Action:** Always wrap dynamically computed objects or filtered arrays returned by custom hooks in `useMemo` to preserve reference stability and prevent redundant calculations.

## 2023-10-25 - Unmemoized derived list filtering directly in render
**Learning:** Found an anti-pattern in multiple components (`HMSModule`, `SuperAdmin`, `ContractModal`, `InventoryModal`) where large arrays were being heavily filtered directly inside the render cycle to produce derived lists like `filteredCrew` or `filteredCompanies`. This causes unnecessary array allocations and string matching operations (`.includes`) on every re-render, impacting performance when lists grow or typing in a search box triggers frequent renders.
**Action:** Always utilize `useMemo` hooks to extract repeated array derivations (`.filter`, mapping logic) out of render functions in large React list components.

## 2025-05-19 - Added In-Memory Cache to WeatherService
**Learning:** Found redundant external API calls originating from inside loops (`Promise.all` in `Dashboard.tsx`) calling `weatherService.getWeather`. This resulted in duplicate requests to Open-Meteo for the same coordinates across different projects, causing UI load blocking and unnecessary bandwidth usage.
**Action:** Always implement memoization or short-lived caching for external stateless API calls (like weather) to bundle concurrent requests and eliminate duplicate sequential requests, particularly when executing within maps or effects.

## 2025-05-18 - Eliminated duplicated O(N) inline array filtering in JSX
**Learning:** Found an anti-pattern in `HMSModule.tsx` and `HMSHandbook.tsx` where `.filter()` arrays were executed inline multiple times in the render cycle for the exact same condition (e.g. once for `list.filter(...).length === 0` check, then again to render `.map(...)`). As datasets scale up, evaluating conditions and mapping duplicate arrays on every keystroke/render causes unnecessary UI jank.
**Action:** Extract any inline `.filter` or `.map` logic executing multiple times during render into a single `useMemo` block with appropriate dependencies. This shares the single computation across length checks and iterations.

## 2024-05-18 - [Use Debounce hook]
**Learning:** React inputs that trigger an async function on change can cause performance issues if not debounced.
**Action:** When working with async search functions, use a `useDebounce` hook to ensure the function is only executed after a short delay.

## 2025-05-19 - Debounced synchronous array filtering on text input
**Learning:** Found an anti-pattern in `Dashboard.tsx` where text inputs (`offerSearchTerm` and `projectSearchTerm`) were used directly in `useMemo` hooks to filter large arrays (`offers` and `projects`). This causes the component to re-render and re-execute expensive string operations (`.toLowerCase()`, `.includes()`) on every keystroke, which can lead to UI jank.
**Action:** When filtering large arrays based on text input (even synchronously), use a `useDebounce` hook on the text input state before passing it into the `useMemo` dependency array. This drastically reduces the number of times the expensive filtering logic runs while the user is typing.
