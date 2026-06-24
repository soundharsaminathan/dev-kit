import type { PlacementAxis } from "@react-aria/overlays";
import type { ComponentPropsWithoutRef } from "react";

export type OverlayArrowProps = ComponentPropsWithoutRef<"div"> & {
  placement?: PlacementAxis | null | undefined;
};

export type OverlayArrowPlacement = PlacementAxis;
