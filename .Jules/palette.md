## 2024-08-24 - Accessibility Improvement: Adding `aria-label` to close buttons
**Learning:** Found a widespread pattern in this application where close buttons (using an "X" icon) lack `aria-label`s. This makes it impossible for screen reader users to understand the purpose of the button.
**Action:** Always add `aria-label="Lukk"` (since the app is primarily in Norwegian) to these icon-only close buttons.
