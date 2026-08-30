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
