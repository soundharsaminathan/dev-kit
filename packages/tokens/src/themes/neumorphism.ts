import type { ThemeDefinition } from "../types.js";

export const neumorphismTheme: ThemeDefinition = {
  id: "neumorphism",
  label: "Neumorphism",
  extends: "default",
  radiusFactor: 1.25,
  color: {
    algorithm: "oklch",
    seeds: {
      neutral: "#64748b",
      accent: "#a855f7",
      success: "#34d399",
      warning: "#fbbf24",
      danger: "#f472b6",
      info: "#38bdf8",
    },
  },
  tokens: {
    effects: {
      "shadow-sm": {
        target: { ref: "neumo-hill" },
        category: "effect",
      },
      "shadow-md": {
        target: { ref: "neumo-hill" },
        category: "effect",
      },
      "neumo-depth": {
        target: {
          light: { value: "10px" },
          dark: { value: "6px" },
        },
        category: "effect",
      },
      "neumo-blur": {
        target: {
          light: { value: "15px" },
          dark: { value: "24px" },
        },
        category: "effect",
      },
      "neumo-light": {
        target: {
          light: {
            value: "color-mix(in oklch, white 50%, var(--neumo-surface))",
          },
          dark: { value: "rgb(255 255 255 / 0.05)" },
        },
        category: "effect",
      },
      "neumo-dark": {
        target: {
          light: {
            value: "color-mix(in oklch, black 26%, var(--neumo-surface))",
          },
          dark: { value: "rgb(0 0 0 / 0.5)" },
        },
        category: "effect",
      },
      "neumo-raised-surface": {
        target: {
          light: {
            value: "color-mix(in oklch, white 8%, var(--color-bg))",
          },
          dark: {
            value: "color-mix(in oklch, white 10%, var(--color-bg))",
          },
        },
        category: "effect",
      },
      "neumo-recessed-surface": {
        target: {
          light: {
            value: "color-mix(in oklch, black 8%, var(--color-bg))",
          },
          dark: {
            value: "color-mix(in oklch, black 20%, var(--color-bg))",
          },
        },
        category: "effect",
      },
      "neumo-raised-gradient": {
        target: {
          light: {
            value:
              "linear-gradient(145deg, color-mix(in oklch, white 12%, var(--color-bg)) 0%, color-mix(in oklch, black 4%, var(--color-bg)) 100%)",
          },
          dark: {
            value:
              "linear-gradient(145deg, color-mix(in oklch, white 14%, var(--color-bg)) 0%, color-mix(in oklch, white 2%, var(--color-bg)) 100%)",
          },
        },
        category: "effect",
      },
      "neumo-recessed-gradient": {
        target: {
          light: {
            value:
              "linear-gradient(145deg, color-mix(in oklch, black 6%, var(--color-bg)) 0%, color-mix(in oklch, black 14%, var(--color-bg)) 100%)",
          },
          dark: {
            value:
              "linear-gradient(145deg, color-mix(in oklch, black 18%, var(--color-bg)) 0%, color-mix(in oklch, black 30%, var(--color-bg)) 100%)",
          },
        },
        category: "effect",
      },
      "neumo-button-surface": {
        target: {
          light: {
            value: "color-mix(in oklch, white 10%, var(--color-bg))",
          },
          dark: {
            value: "color-mix(in oklch, white 16%, var(--color-bg))",
          },
        },
        category: "effect",
      },
      "neumo-button-gradient": {
        target: {
          light: {
            value:
              "linear-gradient(145deg, color-mix(in oklch, white 14%, var(--color-bg)) 0%, color-mix(in oklch, white 4%, var(--color-bg)) 100%)",
          },
          dark: {
            value:
              "linear-gradient(145deg, color-mix(in oklch, white 20%, var(--color-bg)) 0%, color-mix(in oklch, white 8%, var(--color-bg)) 100%)",
          },
        },
        category: "effect",
      },
      "neumo-switch-track-surface": {
        target: {
          light: {
            value: "color-mix(in oklch, black 10%, var(--color-bg))",
          },
          dark: {
            value: "color-mix(in oklch, black 42%, var(--color-bg))",
          },
        },
        category: "effect",
      },
      "neumo-switch-track-gradient": {
        target: {
          light: {
            value:
              "linear-gradient(145deg, color-mix(in oklch, black 8%, var(--color-bg)) 0%, color-mix(in oklch, black 14%, var(--color-bg)) 100%)",
          },
          dark: {
            value:
              "linear-gradient(145deg, color-mix(in oklch, black 38%, var(--color-bg)) 0%, color-mix(in oklch, black 48%, var(--color-bg)) 100%)",
          },
        },
        category: "effect",
      },
      "neumo-primary-gradient": {
        target: {
          light: {
            value:
              "linear-gradient(145deg, color-mix(in oklch, white 22%, var(--color-accent)) 0%, var(--color-accent) 55%, color-mix(in oklch, black 12%, var(--color-accent)) 100%)",
          },
          dark: {
            value:
              "linear-gradient(145deg, color-mix(in oklch, white 24%, var(--color-accent)) 0%, var(--accent-400) 55%, color-mix(in oklch, black 10%, var(--accent-500)) 100%)",
          },
        },
        category: "effect",
      },
      "neumo-dent": {
        target: {
          light: {
            value:
              "inset var(--neumo-depth) var(--neumo-depth) var(--neumo-blur) 0 var(--neumo-light), inset calc(-1 * var(--neumo-depth)) calc(-1 * var(--neumo-depth)) var(--neumo-blur) 0 var(--neumo-dark)",
          },
          dark: {
            value:
              "inset var(--neumo-depth) var(--neumo-depth) var(--neumo-blur) 0 var(--neumo-dark), inset calc(-1 * var(--neumo-depth)) calc(-1 * var(--neumo-depth)) var(--neumo-blur) 0 var(--neumo-light)",
          },
        },
        category: "effect",
      },
    },
    interaction: {
      "interaction-hover-scale": {
        target: { value: "1" },
        category: "interaction",
      },
      "interaction-press-scale": {
        target: { value: "1" },
        category: "interaction",
      },
      "interaction-transition-duration": {
        target: { value: "200ms" },
        category: "interaction",
      },
      "interaction-transition-curve": {
        target: { value: "ease-out" },
        category: "interaction",
      },
    },
    components: {
      "surface-background": {
        target: {
          light: {
            value: "color-mix(in oklch, black 4%, var(--color-bg))",
          },
          dark: {
            value: "color-mix(in oklch, black 35%, var(--color-bg))",
          },
        },
        category: "component",
      },
      "btn-radius": {
        target: { ref: "radius-full" },
        category: "component",
      },
      "btn-shadow": {
        target: { ref: "neumo-hill" },
        category: "component",
      },
      "btn-hover-shadow": {
        target: { ref: "neumo-hill" },
        category: "component",
      },
      "btn-pressed-shadow": {
        target: { ref: "neumo-dent" },
        category: "component",
      },
      "btn-selected-shadow": {
        target: { ref: "neumo-dent" },
        category: "component",
      },
      "btn-default-background": {
        target: { ref: "neumo-button-surface" },
        category: "component",
      },
      "btn-primary-background": {
        target: {
          light: { ref: "color-accent" },
          dark: { ref: "accent-400" },
        },
        category: "component",
      },
      "btn-primary-foreground": {
        target: { ref: "color-fg-on-accent" },
        category: "component",
      },
      "btn-surface-gradient": {
        target: { ref: "neumo-button-gradient" },
        category: "component",
      },
      "btn-default-surface-gradient": {
        target: { ref: "neumo-button-gradient" },
        category: "component",
      },
      "btn-primary-surface-gradient": {
        target: { ref: "neumo-primary-gradient" },
        category: "component",
      },
      "btn-border-color": {
        target: { value: "transparent" },
        category: "component",
      },
      "disabled-background": {
        target: { ref: "neumo-recessed-surface" },
        category: "component",
      },
      "disabled-foreground": {
        target: { ref: "color-fg-muted" },
        category: "component",
      },
      "disabled-border-color": {
        target: { value: "transparent" },
        category: "component",
      },
      "disabled-shadow": {
        target: { ref: "neumo-dent" },
        category: "component",
      },
      "btn-primary-disabled-foreground": {
        target: {
          light: {
            value:
              "color-mix(in oklch, var(--color-accent) 40%, var(--color-bg))",
          },
          dark: {
            value:
              "color-mix(in oklch, var(--color-accent) 32%, var(--color-bg))",
          },
        },
        category: "component",
      },
      "input-disabled-background": {
        target: { ref: "neumo-recessed-surface" },
        category: "component",
      },
      "input-disabled-foreground": {
        target: { ref: "color-fg-muted" },
        category: "component",
      },
      "input-disabled-border-color": {
        target: { value: "transparent" },
        category: "component",
      },
      "input-disabled-shadow": {
        target: { ref: "neumo-dent" },
        category: "component",
      },
      "card-radius": {
        target: { ref: "radius-2xl" },
        category: "component",
      },
      "card-border-width": {
        target: { value: "0px" },
        category: "component",
      },
      "card-shadow": {
        target: { ref: "neumo-hill" },
        category: "component",
      },
      "card-background": {
        target: { ref: "neumo-raised-surface" },
        category: "component",
      },
      "card-surface-gradient": {
        target: { ref: "neumo-raised-gradient" },
        category: "component",
      },
      "input-radius": {
        target: { ref: "radius-2xl" },
        category: "component",
      },
      "input-background": {
        target: { ref: "neumo-recessed-surface" },
        category: "component",
      },
      "input-surface-gradient": {
        target: { ref: "neumo-recessed-gradient" },
        category: "component",
      },
      "input-shadow": {
        target: { ref: "neumo-dent" },
        category: "component",
      },
      "switch-indicator-shadow": {
        target: { ref: "neumo-dent" },
        category: "component",
      },
      "switch-thumb-shadow": {
        target: { ref: "neumo-hill" },
        category: "component",
      },
      "switch-indicator-background": {
        target: { ref: "neumo-switch-track-surface" },
        category: "component",
      },
      "switch-indicator-surface-gradient": {
        target: { ref: "neumo-switch-track-gradient" },
        category: "component",
      },
      "switch-indicator-background-selected": {
        target: {
          light: { ref: "color-accent" },
          dark: { ref: "accent-400" },
        },
        category: "component",
      },
      "switch-thumb-background": {
        target: { ref: "neumo-button-surface" },
        category: "component",
      },
      "switch-thumb-surface-gradient": {
        target: { ref: "neumo-button-gradient" },
        category: "component",
      },
      "slider-thumb-shadow": {
        target: { ref: "neumo-hill" },
        category: "component",
      },
      "slider-track-background": {
        target: { ref: "neumo-recessed-surface" },
        category: "component",
      },
      "slider-track-shadow": {
        target: { ref: "neumo-dent" },
        category: "component",
      },
      "slider-thumb-background": {
        target: { ref: "neumo-raised-surface" },
        category: "component",
      },
      "dialog-shadow": {
        target: { ref: "neumo-hill" },
        category: "component",
      },
      "modal-shadow": {
        target: { ref: "neumo-hill" },
        category: "component",
      },
      "modal-background": {
        target: { ref: "neumo-raised-surface" },
        category: "component",
      },
      "tooltip-shadow": {
        target: { ref: "neumo-hill" },
        category: "component",
      },
      "popover-radius": {
        target: { ref: "radius-2xl" },
        category: "component",
      },
      "scrollbar-size": {
        target: { value: "12px" },
        category: "component",
      },
      "scrollbar-width": {
        target: { value: "auto" },
        category: "component",
      },
      "scrollbar-track-background": {
        target: {
          light: {
            value: "color-mix(in oklch, black 5%, var(--color-bg))",
          },
          dark: {
            value: "color-mix(in oklch, black 22%, var(--color-bg))",
          },
        },
        category: "component",
      },
      "scrollbar-track-shadow": {
        target: { ref: "neumo-dent" },
        category: "component",
      },
      "scrollbar-thumb-background": {
        target: {
          light: {
            value: "color-mix(in oklch, white 20%, var(--color-bg))",
          },
          dark: { ref: "neutral-300" },
        },
        category: "component",
      },
      "scrollbar-thumb-hover-background": {
        target: {
          light: {
            value: "color-mix(in oklch, white 28%, var(--color-bg))",
          },
          dark: { ref: "neutral-400" },
        },
        category: "component",
      },
      "scrollbar-thumb-active-background": {
        target: {
          light: {
            value: "color-mix(in oklch, black 8%, var(--color-bg))",
          },
          dark: { ref: "neutral-200" },
        },
        category: "component",
      },
      "scrollbar-thumb-shadow": {
        target: { ref: "neumo-hill" },
        category: "component",
      },
      "scrollbar-thumb-hover-shadow": {
        target: { ref: "neumo-hill" },
        category: "component",
      },
    },
  },
};
