import type {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  ElementType,
  PropsWithChildren,
} from "react";

export type PolymorphicRef<C extends ElementType> =
  ComponentPropsWithRef<C>["ref"];

export type PolymorphicProps<
  C extends ElementType,
  P = object,
> = PropsWithChildren<P & { as?: C }> &
  Omit<ComponentPropsWithoutRef<C>, keyof P | "as">;

export type PolymorphicPropsWithRef<
  C extends ElementType,
  P = object,
> = PolymorphicProps<C, P> & { ref?: PolymorphicRef<C> };
