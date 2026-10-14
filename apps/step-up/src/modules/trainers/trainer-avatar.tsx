import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import styles from "./trainers.module.scss";

type TrainerAvatarProps = {
  name: string;
  photoUrl?: string | null | undefined;
  size?: "md" | "lg" | "xl";
};

export function TrainerAvatar({
  name,
  photoUrl,
  size = "lg",
}: TrainerAvatarProps) {
  const sizeClass =
    size === "xl"
      ? styles.avatarXl
      : size === "md"
        ? styles.avatarMd
        : styles.avatarLg;

  return (
    <Avatar size={size === "xl" ? "lg" : size} className={sizeClass}>
      {photoUrl ? <AvatarImage src={photoUrl} alt={name} /> : null}
      <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}
