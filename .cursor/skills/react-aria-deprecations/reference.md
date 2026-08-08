# Deprecation migration reference

## ListBox: filter without childNodes

**Before** — `ListProps.filter` + `node.childNodes`:

```typescript
function filterCollectionNodes(nodes, nodeFilter) {
  for (const node of nodes) {
    if (node.type === "section") {
      const childNodes = [...filterCollectionNodes(node.childNodes ?? [], nodeFilter)];
      // ...
    }
  }
}

const state = useListState({ ...props, filter: (nodes) => filterCollectionNodes(nodes, fn) });
```

**After** — `useFilteredListState` + `collection.getChildren`:

```typescript
import { useFilteredListState } from "./filter-list-collection";

const baseState = useListState(listStateProps);
const state = useFilteredListState(baseState, command?.nodeFilter);
```

`filter-list-collection.ts` walks sections via `getCollectionChildren(collection, node.key)` and only sets `childNodes` when emitting filtered section nodes for `ListCollection`.

## Tree: getChildren augmentation

**Before** — read `parent.childNodes` in consumers or broken `firstChildKey` iteration.

**After** — collection-level `getChildren`:

```typescript
function augmentTreeCollection(collection) {
  if (typeof collection.getChildren === "function") return collection;

  return Object.assign(collection, {
    getChildren(key) {
      return {
        *[Symbol.iterator]() {
          const parent = collection.getItem(key);
          const children = parent?.value?.children;
          if (!children?.length) return;
          for (const child of children) {
            const item = collection.getItem(child.id);
            if (item) yield item;
          }
        },
      };
    },
  });
}
```

## Table: row children

```typescript
// ✅
[...(state.collection.getChildren?.(node.key) ?? [])].map((cell) => (
  <TableCellRenderer key={cell.key} node={cell} />
))
```

## Select: controlled value

```typescript
// ❌
<Select selectedKey={value} onSelectionChange={setValue}>

// ✅
<Select value={value} onChange={setValue}>
```

## check-deprecated output

```
Deprecated API usage is not allowed (1):
packages/components/src/foo.tsx:12:5 'childNodes' is deprecated.
```

Fix the reported line, re-run `pnpm check:deprecated`.
