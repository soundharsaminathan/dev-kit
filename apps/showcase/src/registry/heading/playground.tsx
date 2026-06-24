import { Heading } from "@dev-ui/components/heading";

type HeadingPlaygroundProps = {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children?: string;
};

export default function HeadingPlayground({
  level = 1,
  children = "Section title",
}: HeadingPlaygroundProps = {}) {
  return <Heading level={level}>{children}</Heading>;
}
