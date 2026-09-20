import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import {
  canonicalizeFreeStyleName,
  type DanceStyle,
  danceStyleOptions,
  resolveDanceStyle,
} from "@/lib/dance-styles";
import { useStudioDanceStyles } from "@/lib/use-studio-dance-styles";

type DanceStyleSelectProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  catalog?: DanceStyle[];
  isDisabled?: boolean;
};

export function DanceStyleSelect({
  label = "Dance style",
  value,
  onChange,
  placeholder = "Select a style",
  catalog: catalogProp,
  isDisabled = false,
}: DanceStyleSelectProps) {
  const { styles: studioStyles } = useStudioDanceStyles();
  const catalog = danceStyleOptions(catalogProp ?? studioStyles);
  const selected = value.trim() ? resolveDanceStyle(value, catalog).label : "";
  const options = [...catalog];
  if (
    selected &&
    !options.some(
      (style) => style.label.toLowerCase() === selected.toLowerCase(),
    )
  ) {
    options.push(resolveDanceStyle(selected, catalog));
  }

  return (
    <Select
      label={label}
      placeholder={placeholder}
      selectedKey={selected || null}
      onSelectionChange={(key) => {
        if (key == null) {
          onChange("");
          return;
        }
        onChange(canonicalizeFreeStyleName(String(key)));
      }}
      isDisabled={isDisabled}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((style) => (
          <SelectItem
            key={style.id || style.label}
            id={style.label}
            textValue={style.label}
          >
            {style.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
