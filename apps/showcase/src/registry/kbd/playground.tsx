import { Kbd, KbdGroup } from "@dev-ui/components/kbd";

type KbdPlaygroundProps = {
  children?: string;
  showGroup?: boolean;
  modifierKey?: string;
};

export default function KbdPlayground({
  children = "K",
  showGroup = false,
  modifierKey = "⌘",
}: KbdPlaygroundProps = {}) {
  return showGroup ? (
    <KbdGroup>
      <Kbd>{modifierKey}</Kbd>
      <Kbd>{children}</Kbd>
    </KbdGroup>
  ) : (
    <Kbd>{children}</Kbd>
  );
}
