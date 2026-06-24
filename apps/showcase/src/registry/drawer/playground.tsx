import { Button } from "@dev-ui/components/button";
import { Drawer, DrawerHandle } from "@dev-ui/components/drawer";
import { useState } from "react";

type DrawerPlaygroundProps = {
  placement?: "top" | "bottom" | "left" | "right";
  title?: string;
  body?: string;
};

export default function DrawerPlayground({
  placement = "bottom",
  title = "Drawer title",
  body = "Swipe down or click outside to dismiss.",
}: DrawerPlaygroundProps = {}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open drawer</Button>
      <Drawer isOpen={open} onOpenChange={setOpen} placement={placement}>
        <DrawerHandle />
        <div
          style={{
            padding: 24,
            width:
              placement === "left" || placement === "right" ? 280 : undefined,
          }}
        >
          <h2 style={{ marginTop: 0 }}>{title}</h2>
          <p>{body}</p>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </div>
      </Drawer>
    </>
  );
}
