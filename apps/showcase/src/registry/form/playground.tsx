import { Label } from "@dev-ui/components/field";
import { Form } from "@dev-ui/components/form";
import { Input } from "@dev-ui/components/input";
import { TextField } from "@dev-ui/components/text-field";

type FormPlaygroundProps = {
  label?: string;
  placeholder?: string;
};

export default function FormPlayground({
  label = "Email",
  placeholder = "you@example.com",
}: FormPlaygroundProps = {}) {
  return (
    <Form>
      <TextField name="email">
        <Label>{label}</Label>
        <Input type="email" placeholder={placeholder} />
      </TextField>
    </Form>
  );
}
