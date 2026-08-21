import { Button } from "@dev-ui/components/button";
import { Drawer, DrawerHandle } from "@dev-ui/components/drawer";
import { useIsMobile } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/constants";
import { TooltipIconBarItem } from "@/modules/ui/tooltip-icon-bar";
import headerStyles from "../layout/app-header.module.scss";
import { StaffAgentPanel } from "./staff-agent-panel";

export function StaffAgentControl() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const canUse = isAdminRole(user?.role);

  useEffect(() => {
    if (!open || isMobile) return;

    function onPointerDown(event: PointerEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, isMobile]);

  if (!canUse) {
    return null;
  }

  const panel = isMobile ? (
    <StaffAgentPanel onClose={() => setOpen(false)} />
  ) : (
    <StaffAgentPanel />
  );

  return (
    <div className={headerStyles.control} ref={panelRef}>
      <TooltipIconBarItem label="Studio agent">
        <Button
          variant="quiet"
          isIconOnly
          aria-label="Studio agent"
          aria-expanded={open}
          data-testid="staff-agent-toggle"
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name="sparkles" />
        </Button>
      </TooltipIconBarItem>

      {!isMobile && open ? (
        <div
          className={headerStyles.dropdown}
          role="dialog"
          aria-label="Studio agent"
        >
          {panel}
        </div>
      ) : null}

      <Drawer
        placement="bottom"
        isOpen={isMobile && open}
        onOpenChange={setOpen}
      >
        <DrawerHandle />
        <div className={headerStyles.drawerBody}>{panel}</div>
      </Drawer>
    </div>
  );
}
