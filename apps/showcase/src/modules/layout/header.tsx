import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@dev-ui/components/select";
import { ToggleButton } from "@dev-ui/components/toggle-button";
import { ToggleButtonGroup } from "@dev-ui/components/toggle-button-group";
import { cn } from "@dev-ui/core";
import { Link } from "@tanstack/react-router";
import { formatThemeLabel, useTheme } from "@/lib/theme";
import { ShowcaseThemeEditor } from "@/modules/theme-editor/showcase-theme-editor";
import styles from "./header.module.scss";

const navItems = [
  { to: "/", label: "Home", exact: true },
  { to: "/components", label: "Components", exact: false },
  { to: "/themes", label: "Themes", exact: true },
] as const;

export function Header() {
  const { theme, mode, themes, setTheme, setMode } = useTheme();

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <Link to="/" className={styles.logo}>
          Component Showcase
        </Link>
        <nav className={styles.nav} aria-label="Main">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className={styles.navLink}
              activeProps={{
                className: cn(styles.navLink, styles.navLinkActive),
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className={styles.controls}>
        <Select
          className={styles.presetSelect}
          value={theme}
          onChange={(key) => {
            if (key) setTheme(String(key));
          }}
          aria-label="Theme"
        >
          <SelectTrigger />
          <SelectContent>
            {themes.map((item) => (
              <SelectItem key={item.id} id={item.id}>
                {formatThemeLabel(item.id, item.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleButtonGroup
          selectionMode="single"
          selectedKeys={[mode]}
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            if (next === "light" || next === "dark") setMode(next);
          }}
          aria-label="Theme mode"
        >
          <ToggleButton id="light">Light</ToggleButton>
          <ToggleButton id="dark">Dark</ToggleButton>
        </ToggleButtonGroup>
        <ShowcaseThemeEditor />
      </div>
    </header>
  );
}
