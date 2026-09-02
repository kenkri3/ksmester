## 2026-08-30 - Missing Accessibility Labels on Close Buttons
**Learning:** Found an accessibility issue pattern across various components (modals) where the icon-only "Close" buttons (`<X />`) lacked native `aria-label` or `title` tooltips.
**Action:** When creating or updating components with icon-only interactive elements, ensure proper ARIA attributes (e.g. `aria-label="Lukk"`) and native tooltips (`title="Lukk"`) are included to support screen readers and keyboard accessibility. Use Norwegian localized text matching the rest of the application.
## 2026-09-02 - Missing Accessibility Labels on Close Buttons
**Learning:** Found an accessibility issue pattern across various components (modals) where the icon-only "Close" buttons (`<X />`) lacked native `aria-label` or `title` tooltips.
**Action:** When creating or updating components with icon-only interactive elements, ensure proper ARIA attributes (e.g. `aria-label="Lukk"`) and native tooltips (`title="Lukk"`) are included to support screen readers and keyboard accessibility. Use Norwegian localized text matching the rest of the application.
