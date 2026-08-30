type IconProps = {
  className: string;
};

function PhosphorIcon({ className, path }: IconProps & { path: string }) {
  return (
    <span aria-hidden="true" className={className}>
      <svg viewBox="0 0 256 256" fill="currentColor" focusable="false">
        <title>Icon</title>
        <path d={path} />
      </svg>
    </span>
  );
}

/** Phosphor regular paths — inline so the landing chunk never needs IconProvider. */
export function UserPlusIcon({ className }: IconProps) {
  return (
    <PhosphorIcon
      className={className ?? ""}
      path="M256 136a8 8 0 0 1-8 8h-16v16a8 8 0 0 1-16 0v-16h-16a8 8 0 0 1 0-16h16v-16a8 8 0 0 1 16 0v16h16a8 8 0 0 1 8 8Zm-112 21.68a68 68 0 1 0-71.9 0c-20.65 12.35-36.86 32-45.33 57.12a8 8 0 0 0 14.89 5.88C51.79 193.9 77.07 176 108 176s56.21 17.9 66.34 44.68a8 8 0 0 0 14.89-5.88C180.86 189.68 164.65 170 144 157.68ZM108 160a52 52 0 1 1 52-52 52.06 52.06 0 0 1-52 52Z"
    />
  );
}

export function ClipboardTextIcon({ className }: IconProps) {
  return (
    <PhosphorIcon
      className={className ?? ""}
      path="M200 32h-36.26A40 40 0 0 0 92.26 32H56a16 16 0 0 0-16 16v168a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16Zm-72-8a24 24 0 0 1 24 24h-48a24 24 0 0 1 24-24Zm72 192H56V48h28.07A39.9 39.9 0 0 0 80 64v8a8 8 0 0 0 8 8h80a8 8 0 0 0 8-8v-8a39.9 39.9 0 0 0-4.07-16H200Zm-32-80H88a8 8 0 0 1 0-16h80a8 8 0 0 1 0 16Zm0 32H88a8 8 0 0 1 0-16h80a8 8 0 0 1 0 16Z"
    />
  );
}

export function ChartLineIcon({ className }: IconProps) {
  return (
    <PhosphorIcon
      className={className ?? ""}
      path="M232 208a8 8 0 0 1-8 8H32a8 8 0 0 1 0-16h8V48a8 8 0 0 1 16 0v63.36l50.34-50.35a8 8 0 0 1 11.32 0L152 95.36 180.69 66.7a8 8 0 0 1 11.31 11.31l-34.34 34.35a8 8 0 0 1-11.32 0L112 77.66 64 125.66V200h72.4l67.29-96.12a8 8 0 0 1 13.12 9.18L143.13 200H224a8 8 0 0 1 8 8Z"
    />
  );
}

export function CaretDownIcon({ className }: IconProps) {
  return (
    <PhosphorIcon
      className={className ?? ""}
      path="m213.66 101.66-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32Z"
    />
  );
}
