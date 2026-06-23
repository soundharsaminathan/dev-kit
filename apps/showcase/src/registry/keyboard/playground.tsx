import { Keyboard, KeyboardGroup } from "@dev-ui/components/keyboard";

type KeyboardPlaygroundProps = {
  children?: string;
  showGroup?: boolean;
  modifierKey?: string;
};

export default function KeyboardPlayground({
  children = "K",
  showGroup = false,
  modifierKey = "⌘",
}: KeyboardPlaygroundProps = {}) {
  return showGroup ? (
    <KeyboardGroup>
      <Keyboard>{modifierKey}</Keyboard>
      <Keyboard>{children}</Keyboard>
    </KeyboardGroup>
  ) : (
    <Keyboard>{children}</Keyboard>
  );
}
