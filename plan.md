1. **Identify Performance Bottleneck**: `src/components/Dashboard.tsx` contains multiple inline `.filter()` and `.reduce()` operations on arrays like `offers` and `projects` within the render loop.
2. **Optimization**: Extract these calculations out of the render loop by memoizing them with `useMemo`. This will prevent unnecessary recalculations on every render when the underlying arrays and filters have not changed.
3. **Pre-commit**: Complete pre-commit steps to ensure proper testing and formatting.
4. **Create PR**: Submit the PR with the performance improvements.
