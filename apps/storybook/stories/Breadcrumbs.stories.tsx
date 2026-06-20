import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  Breadcrumbs,
} from "@dev-ui/components/breadcrumbs";
import type { Meta, StoryObj } from "@storybook/react-vite";

const collectionItems = [
  { id: "home", label: "Home", href: "#" },
  { id: "components", label: "Components", href: "#" },
  { id: "current", label: "Breadcrumbs" },
];

type BreadcrumbsStoryArgs = {
  isDisabled: boolean;
  useCollection: boolean;
  separator: string;
};

const meta = {
  title: "Components/Breadcrumbs",
  tags: ["ai-generated"],
  argTypes: {
    isDisabled: { control: "boolean" },
    useCollection: { control: "boolean" },
    separator: { control: "text" },
  },
  args: {
    isDisabled: false,
    useCollection: true,
    separator: "›",
  },
  render: ({ isDisabled, useCollection, separator }) =>
    useCollection ? (
      <Breadcrumbs isDisabled={isDisabled} items={collectionItems} />
    ) : (
      <Breadcrumbs isDisabled={isDisabled}>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Home</BreadcrumbLink>
          <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Components</BreadcrumbLink>
          <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink>Breadcrumbs</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumbs>
    ),
} satisfies Meta<BreadcrumbsStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Manual: Story = {
  args: {
    useCollection: false,
  },
};

export const CustomSeparator: Story = {
  args: {
    useCollection: false,
    separator: "/",
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
    useCollection: false,
  },
};
