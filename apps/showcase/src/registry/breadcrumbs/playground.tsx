import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  Breadcrumbs,
} from "@dev-ui/components/breadcrumbs";

const collectionItems = [
  { id: "home", label: "Home", href: "#" },
  { id: "components", label: "Components", href: "#" },
  { id: "current", label: "Breadcrumbs" },
];

type BreadcrumbsPlaygroundProps = {
  isDisabled?: boolean;
  useCollection?: boolean;
  separator?: string;
};

export default function BreadcrumbsPlayground({
  isDisabled = false,
  useCollection = true,
  separator = "›",
}: BreadcrumbsPlaygroundProps = {}) {
  return useCollection ? (
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
  );
}
