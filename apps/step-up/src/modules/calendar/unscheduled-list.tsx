import { Badge } from "@dev-ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dev-ui/components/card";
import { Text } from "@dev-ui/components/text";
import type { UnscheduledBooking } from "./types";
import styles from "./unscheduled-list.module.scss";

type UnscheduledListProps = {
  items: UnscheduledBooking[];
  onSelect?: (item: UnscheduledBooking) => void;
};

export function UnscheduledList({ items, onSelect }: UnscheduledListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unscheduled</CardTitle>
        <CardDescription>
          Confirmed bookings that still need a time
        </CardDescription>
      </CardHeader>
      <CardContent className={styles.list}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.row}
            onClick={() => onSelect?.(item)}
          >
            <Text className={styles.title}>{item.title}</Text>
            <Badge>{item.bookingType}</Badge>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
