# Token Schema

Design tokens in `@dev-ui/tokens` are organized in layers. TypeScript is the source of truth; `pnpm generate-scss` emits CSS custom properties.

## Layers

| Layer | CSS prefix examples | Source |
|-------|---------------------|--------|
| Foundation | `--radius-*`, `--space-*`, `--font-size-*`, `--motion-*` | `src/tokens/foundation.ts` |
| Primitives | `--neutral-*`, `--accent-*`, `--on-neutral-*` | Per-theme color config |
| Semantic | `--color-*`, `--surface-*`, `--text-*`, `--border-*` | `src/theme/semantics.ts`, `src/tokens/semantic.ts` |
| Effects | `--shadow-*`, `--blur-*`, `--elevation-*`, `--glass-*` (`--glass-fill`, `--glass-border`, `--glass-backdrop-blur`, `--glass-vibrant-background`), `--material-*`, `--neumo-*` (`--neumo-hill`, `--neumo-dent`), `--brutal-*`, `--aurora-*`, `--terminal-*` | `src/tokens/effects.ts` |
| Interaction | `--interaction-*` | `src/tokens/interaction.ts` |
| Component | `--btn-*`, `--input-*`, `--modal-*`, etc. | `src/tokens/components.ts` |

## Token definition

Each token maps to a CSS variable name (without `--`) and a target:

- `{ ref: "neutral-500" }` → `var(--neutral-500)`
- `{ onOf: "accent-500" }` → `var(--on-accent-500)`
- `{ value: "0.875rem" }` → literal value
- `{ mix: { space, stops } }` → `color-mix(...)`

## Themes

A theme (`ThemeDefinition`) includes:

- `id` — DOM value for `data-theme`
- `label` — display name
- `extends` — optional parent theme id (inheritance)
- `color` — seed-based OKLCH palette recipe
- `radiusFactor`, `fonts` — optional overrides
- `tokens` — partial overrides for effects, interaction, components

Built-in themes: `default`, `material`, `glassmorphism`, `neumorphism`, `neo-brutalism`, `aurora`, `terminal`.

Legacy aliases: `glass` → `glassmorphism`, `skeuomorphism` → `default`.

Custom themes use ids `custom-<uuid>`, stored in `localStorage` under `dev-ui-custom-themes`.

## DOM activation

```html
<html data-theme="default" data-theme-mode="light">
```

Built-in themes are pre-generated in `scss/themes/`. Custom themes are injected at runtime via `#dev-ui-theme-overrides`.

## Inheritance

Child themes deep-merge over their `extends` chain. Color, fonts, radius, and token vocabularies resolve with the child winning conflicts.
