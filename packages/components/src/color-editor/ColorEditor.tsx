import { cn } from "@dev-ui/core";
import { getColorChannels, useColorPickerState } from "@react-stately/color";
import { useState } from "react";
import { ColorArea } from "../color-area/ColorArea";
import { ColorPickerStateContext } from "../color-context";
import { ColorField } from "../color-field/ColorField";
import { ColorSlider } from "../color-slider/ColorSlider";
import { Input } from "../input/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../select/Select";
import styles from "./color-editor.module.scss";
import type { ColorEditorProps, ColorFormat } from "./types";

function ColorEditor({
  colorFormat: initialColorFormat = "hex",
  showAlphaChannel = false,
  showFormatSelector = true,
  value,
  defaultValue = "#6366F1",
  onChange,
  className,
  ...props
}: ColorEditorProps) {
  const [colorFormat, setColorFormat] =
    useState<ColorFormat>(initialColorFormat);
  const pickerOptions = {
    defaultValue,
    ...(value !== undefined ? { value } : {}),
    ...(onChange !== undefined ? { onChange } : {}),
  };
  const pickerState = useColorPickerState(pickerOptions);

  return (
    <ColorPickerStateContext.Provider value={pickerState}>
      <div
        data-color-editor=""
        className={cn(styles.root, className)}
        {...props}
      >
        <div className={styles.main}>
          <ColorArea
            colorSpace="hsb"
            xChannel="saturation"
            yChannel="brightness"
          />
          <ColorSlider
            orientation="vertical"
            colorSpace="hsb"
            channel="hue"
            className={styles.hueSlider}
            aria-label="Hue"
          />
          {showAlphaChannel ? (
            <ColorSlider
              orientation="vertical"
              colorSpace="hsb"
              channel="alpha"
              className={styles.alphaSlider}
              aria-label="Alpha"
            />
          ) : null}
        </div>
        <div
          className={cn(
            styles.fields,
            colorFormat === "hex" && styles.fieldsHex,
          )}
        >
          {showFormatSelector ? (
            <Select
              aria-label="Color format"
              selectedKey={colorFormat}
              onSelectionChange={(key) => {
                if (key) {
                  setColorFormat(String(key) as ColorFormat);
                }
              }}
              className={cn(
                styles.formatSelect,
                colorFormat === "hex" && styles.formatSelectHex,
              )}
            >
              <SelectTrigger size="sm" />
              <SelectContent>
                <SelectItem id="hex">Hex</SelectItem>
                <SelectItem id="rgb">RGB</SelectItem>
                <SelectItem id="hsl">HSL</SelectItem>
                <SelectItem id="hsb">HSB</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
          <div className={styles.fieldRow}>
            {colorFormat === "hex" ? (
              <ColorField aria-label="Hex" className={styles.field}>
                <Input size="sm" />
              </ColorField>
            ) : (
              getColorChannels(colorFormat).map((channel) => (
                <ColorField
                  key={channel}
                  colorSpace={colorFormat}
                  channel={channel}
                  aria-label={channel}
                  className={styles.field}
                >
                  <Input size="sm" />
                </ColorField>
              ))
            )}
          </div>
        </div>
      </div>
    </ColorPickerStateContext.Provider>
  );
}

export type { ColorEditorProps, ColorFormat } from "./types";
export { ColorEditor };
