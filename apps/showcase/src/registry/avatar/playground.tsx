import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";

export default function AvatarPlayground() {
  return (
    <Avatar>
      <AvatarImage src="/missing.png" alt="User" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  );
}
