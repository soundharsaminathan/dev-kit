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

function Onion({
  cx,
  cy,
  r,
}: {
  cx: number;
  cy: number;
  r: number;
}) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="currentColor" />
      <circle cx={cx} cy={cy - r - 2} r={1.45} fill="currentColor" />
    </>
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
      <Solid d="M40 5.6a2 2 0 0 1 2 2V10h-4V7.6a2 2 0 0 1 2-2ZM38.4 10h3.2v3.2h-3.2V10Z" />
      <Solid d="M26.8 24.6a13.2 13.2 0 0 1 26.4 0H26.8Z" />
      <Solid d="M31 24.6h18v6.6H31V24.6Z" />
      <Onion cx={16.4} cy={34.2} r={5.6} />
      <Onion cx={63.6} cy={34.2} r={5.6} />
      <Solid d="M10 34.2h12.8v6.2H10V34.2ZM57.2 34.2H70v6.2H57.2V34.2ZM8.8 40.2h16.4v17.2H8.8V40.2ZM54.8 40.2h16.4v17.2H54.8V40.2Z" />
      <Solid d="M22.2 30.8h35.6v5.2H22.2V30.8Z" />
      <Solid d="M24 35.8h32v21.6H24V35.8ZM28.2 42.4h3v15H28.2v-15ZM33.4 42.4h3v15h-3v-15ZM38.5 42.4h3v15h-3v-15ZM43.6 42.4h3v15h-3v-15ZM48.8 42.4h3v15h-3v-15Z" />
      <Solid d="M16 57.2h48v8H16v-8ZM10.4 73.2h59.2L62 65H18L10.4 73.2Z" />
      <Shade d="M12.4 44.6h7.6v8.8h-7.6V44.6ZM60 44.6h7.6v8.8H60V44.6ZM25.2 31.8h29.6v2.2H25.2V31.8Z" />
    </Landmark>
  );
}

/** Charminar */
function HyderabadIcon({ className, title }: IconProps) {
  return (
    <Landmark className={className} title={title}>
      <Ground />
      <Onion cx={26.8} cy={13.2} r={4} />
      <Onion cx={53.2} cy={13.2} r={4} />
      <Onion cx={14.8} cy={17.6} r={5.1} />
      <Onion cx={65.2} cy={17.6} r={5.1} />
      <Solid d="M23.2 13.2h7.2v20h-7.2V13.2ZM49.6 13.2h7.2v20h-7.2V13.2ZM10.4 17.6h8.8v54.6H10.4V17.6ZM60.8 17.6h8.8v54.6h-8.8V17.6Z" />
      <Solid d="M18.4 31.2h43.2v6.8H18.4V31.2Z" />
      <Solid d="M20.4 37.2h39.2v35H20.4v-35ZM32.6 72.2V54.4L40 40.6l7.4 13.8v17.8H32.6Z" />
      <Shade d="M12.4 28.8h4.8v5.6h-4.8V28.8ZM62.8 28.8h4.8v5.6h-4.8V28.8ZM12.4 46.2h4.8v6.2h-4.8v-6.2ZM62.8 46.2h4.8v6.2h-4.8v-6.2ZM12.4 60.4h4.8v6.2h-4.8v-6.2ZM62.8 60.4h4.8v6.2h-4.8v-6.2ZM26.4 33.2h27.2v3.2H26.4V33.2Z" />
    </Landmark>
  );
}

/** Gateway of India */
function MumbaiIcon({ className, title }: IconProps) {
  return (
    <Landmark className={className} title={title}>
      <Ground />
      <Solid d="M40 7.2a1.8 1.8 0 0 1 1.8 1.8v2.4h-3.6V9A1.8 1.8 0 0 1 40 7.2Z" />
      <Solid d="M27.6 22.4a12.4 9.6 0 0 1 24.8 0H27.6Z" />
      <Solid d="M18.8 16.8h6.2v8.4h-6.2V16.8ZM55 16.8h6.2v8.4H55V16.8Z" />
      <Solid d="M21.6 22.4h36.8v10.4H21.6V22.4ZM25.2 24.6h5.2v6h-5.2v-6ZM32.4 24.6h5.2v6h-5.2v-6ZM42.4 24.6h5.2v6h-5.2v-6ZM49.6 24.6h5.2v6h-5.2v-6Z" />
      <Solid d="M8.8 32.4h62.4v35.2H8.8V32.4ZM12.4 38.2h10.4v6.4H12.4v-6.4ZM12.4 48.2h10.4v6.4H12.4v-6.4ZM12.4 58.2h10.4v6.4H12.4v-6.4ZM57.2 38.2h10.4v6.4H57.2v-6.4ZM57.2 48.2h10.4v6.4H57.2v-6.4ZM57.2 58.2h10.4v6.4H57.2v-6.4ZM28.4 67.6V46.2c0-11.6 23.2-11.6 23.2 0v21.4H28.4Z" />
      <Solid d="M8 72.8h64l-7.2-5.6H15.2L8 72.8Z" />
      <Shade d="M22.8 23.6h34.4v2.2H22.8V23.6Z" />
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

/** Corporation clock tower */
function CoimbatoreIcon({ className, title }: IconProps) {
  return (
    <Landmark className={className} title={title}>
      <Ground />
      <Solid d="M40 5a1.8 1.8 0 0 1 1.8 1.8V8.8h-3.6V6.8A1.8 1.8 0 0 1 40 5Z" />
      <Solid d="M27.2 20.4a12.8 9.2 0 0 1 25.6 0H27.2Z" />
      <Solid d="M24.4 68.4h31.2v4.4H24.4v-4.4Z" />
      <Solid d="M27.2 20.4h25.6v51.8H27.2V20.4ZM40 30.8m-7 0a7 7 0 1 1 14 0a7 7 0 1 1-14 0ZM33.2 72.2V58.6L40 49.4l6.8 9.2v13.6H33.2Z" />
      <Solid d="M39.15 25.4h1.7v6.6h-1.7V25.4ZM40 30.4h5.2v1.55H40V30.4Z" />
      <Shade d="M29.2 20.2h21.6v2.2H29.2V20.2ZM29.2 41.6h21.6v2.2H29.2V41.6Z" />
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
