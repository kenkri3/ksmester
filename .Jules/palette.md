## 2024-08-24 - Accessibility Improvement: Adding `aria-label` to close buttons
**Learning:** Found a widespread pattern in this application where close buttons (using an "X" icon) lack `aria-label`s. This makes it impossible for screen reader users to understand the purpose of the button.
**Action:** Always add `aria-label="Lukk"` (since the app is primarily in Norwegian) to these icon-only close buttons.
## 2024-05-14 - Icon-only buttons lacking ARIA labels
**Learning:** Found an icon-only button without an `aria-label` or `title` in the `UniversalTranslator` component. This prevents screen readers from announcing the button's purpose and limits keyboard accessibility without visible focus states.
**Action:** Added `aria-label`, `title`, and `focus-visible` styles (`focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 focus-visible:outline-none`) to improve accessibility and keyboard navigation. I should check other icon-only buttons for similar issues.
