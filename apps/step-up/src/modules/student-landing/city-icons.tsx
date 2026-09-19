import type { ReactElement, ReactNode } from "react";

type IconProps = { className?: string | undefined; title?: string | undefined };

function Landmark({
  className,
  title,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 80 80" fill="none" aria-hidden>
      <title>{title ?? "City"}</title>
      {children}
    </svg>
  );
}

function Solid({ d }: { d: string }) {
  return <path d={d} fill="currentColor" fillRule="evenodd" />;
}

function Shade({ d }: { d: string }) {
  return (
    <path d={d} fill="currentColor" fillOpacity="0.22" fillRule="evenodd" />
  );
}

function Ground() {
  return (
    <ellipse
      cx="40"
      cy="74.5"
      rx="28"
      ry="3.2"
      fill="currentColor"
      fillOpacity="0.12"
    />
  );
}

/** Kapaleeshwarar gopuram */
function ChennaiIcon({ className, title }: IconProps) {
  return (
    <Landmark className={className} title={title}>
      <Ground />
      <Solid d="M40 5a3.6 3.6 0 0 1 2.1 6.5L43 14h-6l.9-2.5A3.6 3.6 0 0 1 40 5ZM32.4 17.2h15.2l2.2 7.6H30.2l2.2-7.6ZM28.2 26.8h23.6l2.6 8.8H25.6l2.6-8.8ZM23.8 37.6h32.4l2.8 10.4H21l2.8-10.4ZM19.2 50h41.6l1.6 8.4H17.6L19.2 50ZM20 60h40v12.4A2 2 0 0 1 58 74.4H22a2 2 0 0 1-2-2V60ZM35.4 64.2h9.2v10.2h-9.2V64.2Z" />
      <Shade d="M33.8 20.2h12.4v2.6H33.8V20.2ZM30.2 29.6h19.6v2.8H30.2V29.6ZM26.4 40.4h27.2v3.2H26.4V40.4ZM23.2 52.4h33.6v2.6H23.2V52.4ZM36 48.8h8v3.6h-8V48.8Z" />
    </Landmark>
  );
}

/** Vidhana Soudha */
function BengaluruIcon({ className, title }: IconProps) {
  return (
    <Landmark className={className} title={title}>
      <Ground />
      <Solid d="M40 6.2a2.3 2.3 0 0 1 2.3 2.3V11h-4.6V8.5A2.3 2.3 0 0 1 40 6.2ZM28.2 22.6C31 14.4 40 11.6 51.8 22.6H44V19.8h-8v2.8H28.2ZM12 34.2h16.4V26a13 13 0 0 1 11.6-4.2V27h4.2v-5.2A13 13 0 0 1 55.8 26v8.2H68v8.6H12v-8.6ZM14 44.8h52v19.6H14V44.8ZM18.4 66.4 24 72.6h32l5.6-6.2H18.4Z" />
      <Shade d="M22 36.8h8.6v5H22v-5ZM35.7 36.8h8.6v5h-8.6v-5ZM49.4 36.8H58v5h-8.6v-5ZM24.6 50.4h7v10.2h-7V50.4ZM36.5 50.4h7v10.2h-7V50.4ZM48.4 50.4h7v10.2h-7V50.4Z" />
    </Landmark>
  );
}

/** Charminar */
function HyderabadIcon({ className, title }: IconProps) {
  return (
    <Landmark className={className} title={title}>
      <Ground />
      <Solid d="M20 13.8a4.1 4.1 0 0 1 3.4 6.4h-6.8A4.1 4.1 0 0 1 20 13.8ZM60 13.8a4.1 4.1 0 0 1 3.4 6.4h-6.8A4.1 4.1 0 0 1 60 13.8ZM14.6 21.8h10.8v8.8H14.6V21.8ZM54.6 21.8h10.8v8.8H54.6V21.8ZM16 32.6h12V72H16V32.6ZM52 32.6h12V72H52V32.6ZM28 40h24v32H28V40ZM34.8 50.6c0-6.6 10.4-6.6 10.4 0V72H34.8V50.6Z" />
      <Shade d="M28 32.6h24v7.4H28V32.6ZM19.2 39h5.6v6.2h-5.6V39ZM55.2 39h5.6v6.2h-5.6V39ZM19.2 52.2h5.6v6.2h-5.6v-6.2ZM55.2 52.2h5.6v6.2h-5.6v-6.2Z" />
    </Landmark>
  );
}

/** Gateway of India */
function MumbaiIcon({ className, title }: IconProps) {
  return (
    <Landmark className={className} title={title}>
      <Ground />
      <Solid d="M19.6 12.4a4.4 4.4 0 0 1 3.8 6.8h-7.6a4.4 4.4 0 0 1 3.8-6.8ZM60.4 12.4a4.4 4.4 0 0 1 3.8 6.8h-7.6a4.4 4.4 0 0 1 3.8-6.8ZM12 21.2h15.2v10.4H12V21.2ZM52.8 21.2H68v10.4H52.8V21.2ZM13.6 33.4h16.4V72H13.6V33.4ZM50 33.4h16.4V72H50V33.4ZM29.8 42h20.4v30H29.8V42ZM35.4 50.6c0-7.2 9.2-7.2 9.2 0V72h-9.2V50.6Z" />
      <Shade d="M29.8 31.6h20.4v10.4H29.8V31.6ZM16.8 24h5.6v4.4h-5.6V24ZM57.6 24h5.6v4.4h-5.6V24Z" />
    </Landmark>
  );
}

/** India Gate */
function DelhiIcon({ className, title }: IconProps) {
  return (
    <Landmark className={className} title={title}>
      <Ground />
      <Solid d="M40 6.6a2.5 2.5 0 0 1 2.5 2.5V12h-5V9.1A2.5 2.5 0 0 1 40 6.6ZM31 14h18v5.2H31V14ZM20.2 21.2h39.6v10.4H20.2V21.2ZM22 33.6h36V72H22V33.6ZM31.4 45.8c0-9.6 17.2-9.6 17.2 0V72H31.4V45.8Z" />
      <Shade d="M24.8 23.8h30.4v5.2H24.8v-5.2ZM14 48.6h8v3.6h-8v-3.6ZM58 48.6h8v3.6h-8v-3.6Z" />
    </Landmark>
  );
}

/** Gandhipuram clock tower */
function CoimbatoreIcon({ className, title }: IconProps) {
  return (
    <Landmark className={className} title={title}>
      <Ground />
      <Solid d="M40 5a2.2 2.2 0 0 1 2.2 2.2V9.4h-4.4V7.2A2.2 2.2 0 0 1 40 5ZM31 13.2 34.2 7h11.6L49 13.2H31ZM36 13.2h8v10h-8v-10ZM32.2 54h15.6v18.4H32.2V54ZM27.6 54h24.8v4.4H27.6V54ZM35.2 62.4h9.6V72h-9.6v-9.6Z" />
      <circle
        cx="40"
        cy="37.2"
        r="15.2"
        fill="currentColor"
        fillOpacity="0.18"
      />
      <circle
        cx="40"
        cy="37.2"
        r="15.2"
        stroke="currentColor"
        strokeWidth="3.2"
        fill="none"
      />
      <Solid d="M39.1 25.6h1.8v12.4h-1.8V25.6ZM40 36.2h8.4v1.8H40v-1.8Z" />
    </Landmark>
  );
}

const CITY_ICONS: Record<string, (props: IconProps) => ReactElement> = {
  chennai: ChennaiIcon,
  bengaluru: BengaluruIcon,
  hyderabad: HyderabadIcon,
  mumbai: MumbaiIcon,
  delhi: DelhiIcon,
  coimbatore: CoimbatoreIcon,
};

export function CityLandmarkIcon({
  id,
  className,
  title,
}: {
  id: string;
  className?: string | undefined;
  title?: string | undefined;
}) {
  const Icon = CITY_ICONS[id] ?? ChennaiIcon;
  return <Icon className={className} title={title} />;
}
