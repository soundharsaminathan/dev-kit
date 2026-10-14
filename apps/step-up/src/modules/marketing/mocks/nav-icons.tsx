import {
  Calendar,
  FileText,
  Home,
  LayoutGrid,
  type LucideIcon,
  PhoneCall,
  User,
  Users,
} from "lucide-react";
import type { MockNavId } from "./shell";

const ICONS: Record<MockNavId, LucideIcon> = {
  home: Home,
  batches: LayoutGrid,
  leads: PhoneCall,
  calendar: Calendar,
  students: Users,
  invoices: FileText,
  profile: User,
  certificates: FileText,
  attendance: LayoutGrid,
};

export function MockNavIcon({
  id,
  className,
}: {
  id: MockNavId;
  className: string | undefined;
}) {
  const Icon = ICONS[id];
  return <Icon className={className} strokeWidth={2} aria-hidden />;
}
