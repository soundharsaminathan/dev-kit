import { cn } from "@dev-ui/core";
import { useColorPickerState } from "@react-stately/color";
import { Button } from "../button/Button";
import { ColorArea } from "../color-area/ColorArea";
import { ColorPickerStateContext } from "../color-context";
import { ColorSlider } from "../color-slider/ColorSlider";
import { ColorSwatch } from "../color-swatch/ColorSwatch";
import { Dialog, DialogBody, DialogContent } from "../dialog/Dialog";
import { Modal } from "../modal/Modal";
import styles from "./color-picker.module.scss";
import type { ColorPickerProps } from "./types";

function ColorPicker({
  children,
  className,
  defaultOpen,
  isOpen,
  onOpenChange,
  ...props
}: ColorPickerProps) {
  const state = useColorPickerState(props);
  const dialogProps = {
    ...(defaultOpen !== undefined ? { defaultOpen } : {}),
    ...(isOpen !== undefined ? { isOpen } : {}),
    ...(onOpenChange !== undefined ? { onOpenChange } : {}),
  };

  return (
    <ColorPickerStateContext.Provider value={state}>
      <div data-color-picker="" className={cn(styles.root, className)}>
        <Dialog {...dialogProps}>
          {children ?? (
            <Button
              aria-label="Pick color"
              className={styles.trigger}
              variant="default"
            >
              <ColorSwatch color={state.color} />
            </Button>
          )}
          {children ? null : (
            <Modal>
              <DialogContent>
                <DialogBody className={styles.content}>
                  <div className={styles.areaRow}>
                    <ColorArea
                      colorSpace="hsb"
                      xChannel="saturation"
                      yChannel="brightness"
                    />
                    <div className={styles.sliders}>
                      <ColorSlider
                        orientation="vertical"
                        colorSpace="hsb"
                        channel="hue"
                        className={styles.verticalSlider}
                        aria-label="Hue"
                      />
                    </div>
                  </div>
                </DialogBody>
              </DialogContent>
            </Modal>
          )}
        </Dialog>
      </div>
    </ColorPickerStateContext.Provider>
  );
}

export type { ColorPickerProps } from "./types";
export { ColorPicker };
