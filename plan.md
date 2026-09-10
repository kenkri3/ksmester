1. **Import `useDebounce`**: Import the `useDebounce` hook in `src/components/Dashboard.tsx`.
2. **Debounce Search Terms**: Wrap `offerSearchTerm` and `projectSearchTerm` with `useDebounce` in `Dashboard.tsx`.
3. **Optimize Filtering Logic**: Extract `.toLowerCase()` on the debounced search terms outside the `.filter()` loop in `filteredOffersList` and `filteredProjectsList` to prevent repetitive O(N) string manipulation on each render.
4. **Pre-commit Checks**: Run `pre_commit_instructions` and follow the required steps.
5. **Submit**: Create a PR with the performance improvement.
