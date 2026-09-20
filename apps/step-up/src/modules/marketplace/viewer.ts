export function marketplacePersonalBadges(input: {
  viewerEnrolled?: boolean | null;
  viewerTrialBooked?: boolean | null;
  viewerForChild?: boolean | null;
}): Array<{ id: "child" | "enrolled" | "trial"; label: string }> {
  const badges: Array<{ id: "child" | "enrolled" | "trial"; label: string }> =
    [];
  if (input.viewerForChild) badges.push({ id: "child", label: "Your child" });
  if (input.viewerEnrolled) badges.push({ id: "enrolled", label: "Enrolled" });
  if (input.viewerTrialBooked) {
    badges.push({ id: "trial", label: "Trial booked" });
  }
  return badges;
}
