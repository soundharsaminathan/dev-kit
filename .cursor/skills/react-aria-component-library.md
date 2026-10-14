It is written as an internal engineering guideline for building a React component library using React Aria.

---

# React Aria Component Library – Best Practices

## Purpose

This skill defines architectural and implementation best practices for building an accessible, scalable, and production-grade component library using **React Aria**.

This guideline assumes:

* React 19+
* Strict TypeScript
* SCSS + CSS variable tokens
* Headless + styled architecture
* ESM-first library output
* Accessibility-first philosophy

---

# 0. Reference Implementations

When creating components with React Aria, use these repositories for **behavior, API design, and structure** only. **Do not adopt Tailwind CSS** from them; this library uses SCSS and design tokens.

## React Aria behavior and structure

* **[Untitled UI React](https://github.com/untitleduico/react)** – React Aria–based components (React 19, TypeScript). Use for:
  * How hooks are used (e.g. `useButton`, `usePress`, composition patterns)
  * Component API and prop naming
  * Compound component and slot patterns
  * **Ignore:** Tailwind classes; translate patterns into SCSS + `data-*` attributes and tokens.

* **[HeroUI v3 (React)](https://github.com/heroui-inc/heroui/tree/v3/packages/react/src/components)** – React Aria components in a design system. Use for:
  * Hook usage and ref forwarding
  * Variant/size/state prop patterns
  * **Ignore:** Tailwind and their styling stack; keep our SCSS + token approach.

* **[Jolly-UI](https://github.com/jolbol1/jolly-ui)** – shadcn-compatible React Aria Components. Use for:
  * **Styling states:** [CODE-STYLE.md](https://github.com/jolbol1/jolly-ui/blob/main/CODE-STYLE.md) documents “Using Data Attributes for Stateful Styles”: `data-hovered` and `data-pressed` instead of `:hover` / `:active`, consistent across mouse, touch, keyboard. Aligns with §5.1 slot-based style over state-based style.
  * `className` as render prop with `values` for state; organizing data-attribute styles with comments.
  * **Ignore:** Tailwind (they use `data-[hovered]:…`); we use SCSS `[data-hovered]`, same principle.

## Styling reference

* **[tweakcn – components/ui](https://github.com/jnsahaj/tweakcn/tree/main/components/ui)** – Use for **styling patterns** only:
  * Variant and state styling structure (e.g. default, destructive, outline)
  * Layout and spacing patterns for buttons, inputs, dialogs, etc.
  * **Implement in our stack:** SCSS files, CSS variables from `@dev-ui/tokens`, and `data-variant` / `data-size` / `data-state` selectors—not Tailwind or tweakcn’s class names.

Summary: **React Aria behavior** → Untitled UI React + HeroUI v3 (no Tailwind). **Styling** → tweakcn for structure and variants, implemented with SCSS and tokens.

---

# 1. Architectural Philosophy

## 1.1 Headless + Styled Separation

React Aria provides behavior and accessibility logic.
Your library provides:

* Styling (SCSS)
* Design tokens
* Variant system
* Theming
* API ergonomics

Never mix styling logic inside React Aria hook usage.

Correct structure:

```
Component
 ├── React Aria hook (behavior)
 ├── DOM structure
 ├── data-* attributes for variants
 └── SCSS styling (token-based)
```

---

# 2. Core Principles

## 2.1 Accessibility Is Non-Optional

Every component must:

* Support keyboard navigation
* Provide correct ARIA roles
* Expose accessible names
* Respect focus management
* Pass automated axe tests

No component may ship without accessibility validation.

---

## 2.2 Strict Type Safety

* Strict TypeScript enabled
* No `any`
* Use generics where necessary
* Export component prop types
* Support polymorphic `as` when applicable

---

## 2.3 No Styling Logic in JS

Do NOT:

* Use inline styles
* Compute styles at runtime
* Mix design tokens with logic

All styling must use:

* CSS variables (design tokens + component-provided variables when available)
* SCSS with a single root class per component (e.g. `.ui-button`)
* `data-*` attribute selectors for variants and states (see §5)

---

# 5. Styling Rules (React Aria Alignment)

Follow [React Aria’s styling guidance](https://react-aria.adobe.com/styling). React Aria does not ship styles; we provide SCSS + tokens. **Do not use Tailwind**; implement the same ideas with our stack.

## 5.1 States via data attributes

React Aria exposes interaction states as **data attributes**, which behave like custom pseudo-classes and work consistently across mouse, touch, and keyboard (unlike `:hover` / `:active` alone). Style them in SCSS with attribute selectors.

Use these where the hook or component supports them:

| State / purpose | Data attribute | Notes |
|-----------------|---------------|--------|
| Pressed | `data-pressed` | **Transient** “user is pressing” (useButton’s `isPressed`). Slot-based; prefer over CSS `:active` for that feedback. **Not** the same as active/selected (see below). |
| Hovered | `data-hovered` | Slot-based; prefer over `:hover` (see strict rule below) |
| Focus visible | `data-focus-visible` or `:focus-visible` | Always support focus-visible styles |
| Disabled | `data-disabled` or `data-state="disabled"` | For disabled styling and non-button elements |
| Selected | `data-selected` | **Persistent** “item is selected/on” (listbox, tabs, toggle on). **Not** the same as pressed. |
| Focused (within) | `data-focused` | When component tracks focus internally |
| Entering / exiting | `data-entering`, `data-exiting` | Overlays; use for entry/exit animations |

**Do not conflate pressed and active/selected.** In React Aria, **pressed** (`isPressed` / `data-pressed`) is a *transient* state while the user is pressing (pointer/key down). **Active/selected** (`data-selected` or similar) is a *persistent* state (e.g. selected tab, toggle button on). Use the correct attribute for each.

### Strict rule: Slot-based style over state-based style

**You must prefer slot-based styling (React Aria’s data attributes) over state-based styling (CSS pseudo-classes like `:hover`, `:active`) for interaction states.** Style by the slots the component exposes (`[data-hovered]`, `[data-pressed]`, `[data-selected]`, etc.), not by raw DOM/browser state.

**Why this is required:**

* **State-based pseudo-classes are unreliable across devices:** `:hover` and `:active` depend on browser/pointer behavior. On touch devices, `:hover` is emulated and can stick or never apply; on hybrid (mouse + touch) devices, behavior is inconsistent.
* **Keyboard and screen reader users** do not trigger `:hover` or many `:active` flows. Styling only via pseudo-classes leaves those users without the same feedback.
* **Slot-based attributes** are set by React Aria hooks (e.g. `useHover`, `useButton`’s `isPressed`) that normalize input: they ignore emulated events and apply state consistently for mouse, touch, and keyboard. Styling off those attributes gives one consistent experience.

**Implementation:**

* **In the component:** Use the hooks that provide the state (e.g. `useHover` from `@react-aria/interactions`, `useButton`’s `isPressed`); spread their props and set the corresponding data attributes (e.g. `data-hovered={isHovered ? "true" : undefined}`, `data-pressed={isPressed ? "true" : undefined}`).
* **In SCSS:** Target interaction states with attribute selectors (e.g. `&[data-hovered]`, `&[data-pressed]`). Do not use `&:hover` or `&:active` for the same interaction.

Example (SCSS):

```scss
.ui-button {
  &[data-pressed] { /* pressed state */ }
  &[data-state="disabled"],
  &:disabled { /* disabled */ }
  /* Slot-based: [data-hovered] works across mouse, touch, keyboard */
  &[data-hovered]:not([data-state="disabled"]) {
    background-color: var(--color-button-primary-hover);
  }
  &:focus-visible { outline: 2px solid var(--color-focus-ring); }
}
```

Do not rely on CSS pseudo-classes alone for press, hover, or other interaction states; use the data attributes and hooks React Aria provides so keyboard and touch get the same feedback as mouse.

**Reference:** [Jolly-UI CODE-STYLE.md](https://github.com/jolbol1/jolly-ui/blob/main/CODE-STYLE.md) documents the same principle (“Using Data Attributes for Stateful Styles”): use `data-[hovered]` / `data-[pressed]` (Tailwind) instead of `:hover` / `:active`; we use SCSS `[data-hovered]` / `[data-pressed]` with the same intent.

## 5.2 Class names and root class

* Each component has a **single root class** (e.g. `.ui-button`, `.ui-select`). Apply it via `className` on the root element.
* Accept a custom `className` from props and merge it with the root class if needed. Do not let consumer class override critical layout/state styles; keep variants and states on the root or delegated elements via `data-*`.
* We do **not** use React Aria’s default class names (e.g. `react-aria-Button`); we use our own naming and SCSS.

## 5.3 Slots

For compound components that render multiple instances (e.g. increment/decrement buttons), React Aria uses a `slot` prop. Style by slot in SCSS when needed:

```scss
.ui-number-field {
  [slot="increment"] { /* ... */ }
  [slot="decrement"] { /* ... */ }
}
```

## 5.4 CSS variables

* **Design tokens:** Use semantic CSS variables from `@dev-ui/tokens` for all colors, spacing, radius, shadow (see §6 Token Usage Rules).
* **Component-provided variables:** Some React Aria patterns expose variables (e.g. Popover `--trigger-width`). Use them in SCSS when available for layout or positioning; do not replace token-based theming with them.

## 5.5 Animation (overlays and collections)

For overlays and similar components:

* **Entry/exit:** Use `data-entering` and `data-exiting` in SCSS. Put the **transition** on the default state; set the **starting** state in `[data-entering]` and the **ending** state in `[data-exiting]`.
* Prefer CSS transitions or keyframes; avoid inline style-driven animation unless required.

Example:

```scss
.ui-popover {
  transition: opacity 200ms, transform 200ms;
  &[data-entering] {
    opacity: 0;
    transform: scale(0.95);
  }
  &[data-exiting] {
    opacity: 0;
    transition-duration: 150ms;
  }
}
```

---

# 3. Component Structure Pattern

Each component must follow this structure:

```
component-name/
  Component.tsx
  component.scss
  component.types.ts
  index.ts
```

### Component Implementation Pattern

1. Call React Aria hook
2. Merge returned props
3. Apply data attributes
4. Forward ref
5. Keep DOM minimal

Example structure:

```tsx
const { buttonProps } = useButton(props, ref);

return (
  <button
    {...buttonProps}
    data-variant={variant}
    data-size={size}
    className="ui-button"
  />
);
```

---

# 4. Focus Management (see also §5.1 focus-visible)

React Aria manages focus logic. You must:

* Preserve forwarded refs
* Never override focus behavior
* Ensure focus-visible styles exist
* Avoid removing outline without replacement

SCSS must define:

```scss
&:focus-visible {
  outline: 2px solid var(--color-focus-ring);
}
```

---

# 6. Token Usage Rules

Components must never use raw colors.

Allowed:

```
var(--color-button-primary-bg)
```

Not allowed:

```
#2563eb
rgb(...)
hsl(...)
```

Tokens must support:

* Light mode
* Dark mode
* Semantic mapping
* Future theme extension

---

# 7. Variant Strategy

For inspiration on variant breakdowns and state styling (e.g. default, destructive, outline), see [tweakcn components/ui](https://github.com/jnsahaj/tweakcn/tree/main/components/ui)—then implement with SCSS and `data-*` attributes below. For **interaction states** (pressed, hovered, disabled, selected, entering/exiting), use the React Aria data attributes described in §5.1.

Variants must use data attributes:

```
data-variant
data-size
data-state
```

Example:

```scss
.ui-button[data-variant="primary"] { ... }
.ui-button[data-state="disabled"],
.ui-button[data-pressed] { ... }
```

Do not generate dynamic class strings.

---

# 8. Controlled vs Uncontrolled Patterns

When component state is involved:

* Support controlled mode
* Support uncontrolled mode
* Use `useControlledState` pattern
* Clearly document behavior

Never mix state ownership ambiguously.

---

# 9. Composition Rules

Prefer compound component patterns when needed:

```
<Select>
  <Select.Trigger />
  <Select.Content />
</Select>
```

But only when required by interaction complexity.

Avoid unnecessary abstraction.

---

# 10. Server Compatibility (React 19 Era)

Components must:

* Avoid `window` usage at module scope
* Avoid side effects on import
* Work in SSR
* Respect "use client" boundaries where necessary

---

# 11. Testing Standards

Each component must include:

* Render test
* Role query test
* Keyboard interaction test
* Disabled state test
* Accessibility test (axe)

Example:

```ts
expect(screen.getByRole("button")).toBeInTheDocument();
```

Never test implementation details.
Always test via accessible roles.

---

# 12. Performance Guidelines

* Externalize React
* Avoid heavy dependencies
* Avoid unnecessary context nesting
* Avoid re-renders due to unstable props

Measure:

* Bundle size per component
* CSS output size
* Tree-shaking integrity

---

# 13. When to Use React Aria

Use React Aria for:

* Button
* Checkbox
* Radio
* Switch
* Tabs
* Listbox
* Combobox
* Dialog
* Menu
* Overlay
* Date components

Do NOT use it for purely presentational components like:

* Box
* Stack
* Card
* Typography

---

# 14. Common Mistakes to Avoid

❌ Wrapping everything in unnecessary divs
❌ Breaking ARIA relationships
❌ Ignoring focus ring styling
❌ Hardcoding colors
❌ Overriding returned hook props incorrectly
❌ Forgetting disabled state propagation
❌ Using role manually when hook already applies it
❌ Styling only with `:hover` / `:active` and ignoring React Aria’s `data-pressed`, `data-hovered`, etc. (see §5.1)

---

# 15. Documentation Requirements

Each component must document:

* Accessibility behavior
* Keyboard interaction
* Controlled vs uncontrolled
* Variant matrix
* Theming support

Storybook must include:

* Light mode
* Dark mode
* All variants
* All states

---

# 16. Code Review Checklist

Before merging:

* Strict typing verified
* No raw color usage
* No accessibility warnings
* No inline styles
* Bundle size acceptable
* SSR safe
* Tests passing
* Storybook story added

---

# 17. Philosophy Summary

React Aria handles:

* Accessibility
* Behavior
* State logic

Your library handles:

* Design system
* Tokens
* Visual consistency
* DX polish
* API stability

Separation of concerns must remain clean.

---

If you want, I can also prepare:

* A stricter enterprise-grade version
* A lightweight internal-team version
* Or a companion skill file for SCSS token architecture
