import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@dev-ui/components/card";

type CardPlaygroundProps = {
  size?: "sm" | "default";
  title?: string;
  description?: string;
  content?: string;
  footer?: string;
};

export default function CardPlayground({
  size = "default",
  title = "Card title",
  description = "Card description",
  content = "Main content",
  footer = "Footer actions",
}: CardPlaygroundProps = {}) {
  return (
    <Card size={size}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
      <CardFooter>{footer}</CardFooter>
    </Card>
  );
}
