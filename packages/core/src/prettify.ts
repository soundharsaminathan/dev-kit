/**
 * Flattens intersection types so the IDE shows a single object with all keys
 * instead of a long chain of `A & B & C`. Improves hover and autocomplete.
 */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};
