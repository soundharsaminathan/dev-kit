import { Text, type TextProps } from "@dev-ui/components/text";

export default function TextPlayground({
  children = "Helper text for a field.",
  ...props
}: TextProps = {}) {
  return <Text {...props}>{children}</Text>;
}
