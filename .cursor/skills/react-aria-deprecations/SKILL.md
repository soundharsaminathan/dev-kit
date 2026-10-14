---
name: react-aria-deprecations
description: >-
  Migrates deprecated React Aria, React Stately, and @react-types/shared APIs
  in dev-kit. Enforces collection.getChildren over node.childNodes, removes legacy
  shims, and runs check-deprecated. Use when fixing deprecations, removing legacy
  support, collection filtering, or TypeScript 6385 suggestion diagnostics.
---

# React Aria deprecations (dev-kit)

## Enforcement

Deprecated API usage fails CI via `scripts/check-deprecated.ts` (TS diagnostic **6385**). Wired into `dev-kit:typecheck` as `check-deprecated`.

```bash
pnpm check:deprecated
pnpm exec nx run dev-kit:typecheck
```

`tsc -b` does **not** report suggestion diagnostics — always run `check-deprecated` after edits.

## Workflow

1. Run `pnpm check:deprecated` to list violations (file:line + message).
2. Fix each call site — no `@ts-expect-error`, no dual-path legacy support.
3. For collection traversal, switch to `collection.getChildren(key)`.
4. Re-run `check-deprecated`, package `typecheck`, and affected Vitest tests.

## Collection children (critical)

`Node.childNodes` is deprecated. Consumers must use **`collection.getChildren(node.key)`**.

### Do

- Read children through the collection.
- If a stately collection lacks `getChildren`, augment the **collection** once (e.g. `augmentTreeCollection` in `Tree.tsx`).
- Inside augmentation, prefer domain data (`node.value.children` for `TreeNode`) over reading `node.childNodes`.

### Do not

- `getSectionChildNodes` / casts to read `childNodes`.
- `node.childNodes ?? []` in renderers, filters, or hooks.
- `firstChildKey` / `nextKey` for tree siblings — those are not tree child links.

### Allowed exception

When **building** nodes for `new ListCollection(...)`, section nodes may include `childNodes` — React Stately's constructor requires it. See `packages/components/src/list-box/filter-list-collection.ts`.

## List filtering

Do **not** use:

- `ListProps.filter` with a manual `childNodes` walk.
- `UNSTABLE_useFilteredListState` — `ListCollection` in this repo has no `.filter()`.

Use `useListState` + `useFilteredListState` from `filter-list-collection.ts`:

```typescript
const baseState = useListState(listStateProps);
const state = useFilteredListState(baseState, command?.nodeFilter);
```

Filter predicate shape: `(nodeValue: string, node: Node<T>) => boolean`.

## Common API replacements

| Deprecated | Replacement |
|------------|-------------|
| `selectedKey` + `onSelectionChange` on Select | `value` + `onChange` |
| `selectedItem` | `selectedItems[0]` |
| `React.ElementRef` | `React.ComponentRef` |
| `node.childNodes` | `collection.getChildren(node.key)` |
| Table/Tree row cells | `[...(collection.getChildren?.(node.key) ?? [])]` |

## Component-specific notes

- **Tree**: `augmentTreeCollection` adds `getChildren` from `TreeNode.children` ids. `nodeHasChildItems` uses `collection.getChildren`.
- **Table**: Column/cell iteration uses `state.collection.getChildren(node.key)`.
- **ListBox / Command**: Command search filtering goes through `useFilteredListState`.
- **Select / Field**: Put `<Label>` inside `<Select>` for StrictMode-safe labeling; avoid duplicate `aria-label` on hidden native select.

## Showcase / tests

- Console tests in `apps/showcase/src/test-utils/react-aria-warnings.ts` catch label warnings at runtime.
- Deprecation is compile-time only — `check-deprecated` is the guard for prop/type deprecations.

## Reference

See [reference.md](reference.md) for before/after examples from this codebase.
