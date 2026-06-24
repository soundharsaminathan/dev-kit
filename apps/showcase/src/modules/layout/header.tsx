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
import { formatPresetLabel, useTheme } from "@/lib/theme";
import styles from "./header.module.scss";

const navItems = [
  { to: "/", label: "Home", exact: true },
  { to: "/components", label: "Components", exact: false },
  { to: "/themes", label: "Themes", exact: true },
] as const;

export function Header() {
  const { preset, mode, presets, setPreset, setMode } = useTheme();

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
          value={preset}
          onChange={(key) => {
            if (key) setPreset(String(key) as typeof preset);
          }}
          aria-label="Theme preset"
        >
          <SelectTrigger />
          <SelectContent>
            {presets.map((name) => (
              <SelectItem key={name} id={name}>
                {formatPresetLabel(name)}
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
      </div>
    </header>
  );
}
