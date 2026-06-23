import { Label } from "@dev-ui/components/field";
import { Form } from "@dev-ui/components/form";
import { Input } from "@dev-ui/components/input";
import { TextField } from "@dev-ui/components/text-field";
import type { Meta, StoryObj } from "@storybook/react-vite";

type FormStoryArgs = {
  label: string;
  placeholder: string;
};

const meta = {
  title: "Components/Form",
  tags: ["ai-generated"],
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
  },
  args: {
    label: "Email",
    placeholder: "you@example.com",
  },
  render: ({ label, placeholder }) => (
    <Form>
      <TextField>
        <Label>{label}</Label>
        <Input type="email" placeholder={placeholder} />
      </TextField>
    </Form>
  ),
} satisfies Meta<FormStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
