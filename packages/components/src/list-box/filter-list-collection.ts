import type { ListState } from "@react-stately/list";
import { ListCollection } from "@react-stately/list";
import type { Collection, Key, Node } from "@react-types/shared";
import { useMemo } from "react";

function getCollectionChildren<T extends object>(
  collection: Collection<Node<T>>,
  key: Key,
): Node<T>[] {
  const children = collection.getChildren?.(key);
  return children ? [...children] : [];
}

function filterNode<T extends object>(
  collection: Collection<Node<T>>,
  node: Node<T>,
  filterFn: (nodeValue: string, node: Node<T>) => boolean,
): Node<T> | null {
  if (node.type === "section") {
    const filteredChildren = getCollectionChildren(collection, node.key)
      .map((child) => filterNode(collection, child, filterFn))
      .filter((child): child is Node<T> => child !== null);

    if (filteredChildren.length === 0) {
      return null;
    }

    return { ...node, childNodes: filteredChildren };
  }

  if (node.type === "item") {
    return filterFn(String(node.textValue ?? ""), node) ? node : null;
  }

  return node;
}

export function filterListCollection<T extends object>(
  collection: Collection<Node<T>>,
  filterFn: (nodeValue: string, node: Node<T>) => boolean,
): Collection<Node<T>> {
  const filteredNodes = [...collection]
    .map((node) => filterNode(collection, node, filterFn))
    .filter((node): node is Node<T> => node !== null);

  return new ListCollection(filteredNodes);
}

export function useFilteredListState<T extends object>(
  state: ListState<T>,
  filterFn: ((nodeValue: string, node: Node<T>) => boolean) | undefined,
): ListState<T> {
  const collection = useMemo((): Collection<Node<T>> => {
    if (!filterFn) {
      return state.collection;
    }

    return filterListCollection(state.collection, filterFn);
  }, [filterFn, state.collection]);

  const selectionManager = useMemo(
    () => state.selectionManager.withCollection(collection),
    [collection, state.selectionManager],
  );

  return useMemo(
    (): ListState<T> => ({
      collection,
      disabledKeys: state.disabledKeys,
      selectionManager,
    }),
    [collection, selectionManager, state.disabledKeys],
  );
}
