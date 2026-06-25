import {
  listEditableTokensForLayer,
  type ResolvedTheme,
  type ThemeDraft,
  type TokenLayerKey,
} from "@dev-ui/tokens";
import { type ReactNode, useMemo } from "react";
import { Button } from "../button/Button";
import {
  Disclosure,
  DisclosurePanel,
  DisclosureTrigger,
} from "../disclosure/Disclosure";
import { Input } from "../input/Input";
import { ThemeLayerPreview } from "./ThemeLayerPreview";
import styles from "./theme-editor.module.scss";

interface TokenLayerPanelProps {
  draft: ThemeDraft;
  resolved: ResolvedTheme;
  layer: TokenLayerKey;
  label: string;
  tokenCount: number;
  headerContent?: ReactNode;
  onTokenChange: (
    layer: TokenLayerKey,
    name: string,
    value: string | null,
    category: ReturnType<typeof listEditableTokensForLayer>[number]["category"],
  ) => void;
}

function TokenLayerPanelContent({
  draft,
  resolved,
  layer,
  headerContent,
  onTokenChange,
}: Omit<TokenLayerPanelProps, "label" | "tokenCount">) {
  const tokens = useMemo(
    () => listEditableTokensForLayer(draft, layer, resolved),
    [draft, layer, resolved],
  );

  return (
    <>
      <ThemeLayerPreview section={layer} />
      {headerContent}
      <div className={styles.tokenList}>
        {tokens.map((token) => {
          const displayValue = token.isOverride
            ? (token.overrideValue ?? "")
            : "";
          return (
            <div key={token.name} className={styles.tokenRow}>
              <div>
                <div className={styles.tokenName}>--{token.name}</div>
                {!token.isOverride ? (
                  <div className={styles.tokenHint}>{token.cssValue}</div>
                ) : null}
              </div>
              <Input
                aria-label={`${token.name} value`}
                placeholder={token.cssValue}
                value={displayValue}
                onChange={(event) => {
                  const next = event.target.value;
                  if (next === "") return;
                  onTokenChange(layer, token.name, next, token.category);
                }}
                onBlur={(event) => {
                  if (event.target.value.trim() === "") {
                    onTokenChange(layer, token.name, null, token.category);
                  }
                }}
              />
              {token.isOverride ? (
                <Button
                  variant="quiet"
                  size="sm"
                  aria-label={`Reset ${token.name}`}
                  onClick={() =>
                    onTokenChange(layer, token.name, null, token.category)
                  }
                >
                  Reset
                </Button>
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function TokenLayerPanel({
  draft,
  resolved,
  layer,
  label,
  tokenCount,
  headerContent,
  onTokenChange,
}: TokenLayerPanelProps) {
  if (tokenCount === 0) return null;

  return (
    <Disclosure id={`theme-layer-${layer}`}>
      <DisclosureTrigger>
        {label}
        <span className={styles.layerCount}>({tokenCount})</span>
      </DisclosureTrigger>
      <DisclosurePanel mountWhen="expanded-once">
        <TokenLayerPanelContent
          draft={draft}
          resolved={resolved}
          layer={layer}
          headerContent={headerContent}
          onTokenChange={onTokenChange}
        />
      </DisclosurePanel>
    </Disclosure>
  );
}

export { TokenLayerPanel };
