import {
  Tag,
  TagGroup,
  TagGroupLabel,
  TagList,
} from "@dev-ui/components/tag-group";

type TagGroupPlaygroundProps = {
  size?: "sm" | "md" | "lg";
  label?: string;
  isRemovable?: boolean;
};

export default function TagGroupPlayground({
  size = "md",
  label = "Categories",
  isRemovable = false,
}: TagGroupPlaygroundProps = {}) {
  return (
    <TagGroup
      size={size}
      onRemove={
        isRemovable
          ? (keys) => {
              console.log("remove", [...keys]);
            }
          : undefined
      }
    >
      <TagGroupLabel>{label}</TagGroupLabel>
      <TagList>
        {isRemovable ? (
          <>
            <Tag id="news">News</Tag>
            <Tag id="travel">Travel</Tag>
            <Tag id="gaming">Gaming</Tag>
          </>
        ) : (
          <>
            <Tag>News</Tag>
            <Tag>Travel</Tag>
            <Tag>Gaming</Tag>
            <Tag>Shopping</Tag>
          </>
        )}
      </TagList>
    </TagGroup>
  );
}
