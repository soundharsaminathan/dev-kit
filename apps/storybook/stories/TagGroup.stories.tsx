import {
  Tag,
  TagGroup,
  TagGroupLabel,
  TagList,
} from "@dev-ui/components/tag-group";
import type { Meta, StoryObj } from "@storybook/react-vite";

type TagGroupStoryArgs = {
  size: "sm" | "md" | "lg";
  label: string;
  isRemovable: boolean;
};

const meta = {
  title: "Components/TagGroup",
  tags: ["ai-generated"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    label: { control: "text" },
    isRemovable: { control: "boolean" },
  },
  args: {
    size: "md",
    label: "Categories",
    isRemovable: false,
  },
  render: ({ size, label, isRemovable }) => (
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
  ),
} satisfies Meta<TagGroupStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Removable: Story = {
  args: {
    label: "Filters",
    isRemovable: true,
  },
};
