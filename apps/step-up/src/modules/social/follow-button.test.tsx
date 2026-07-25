import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { FollowButton } from "./follow-button";

describe("FollowButton", () => {
  it("calls onFollow for public profiles", () => {
    const onFollow = vi.fn();
    renderWithProviders(
      <FollowButton isFollowing={false} onFollow={onFollow} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Follow" }));
    expect(onFollow).toHaveBeenCalledTimes(1);
  });

  it("shows Request for private profiles", () => {
    const onFollow = vi.fn();
    renderWithProviders(
      <FollowButton
        isFollowing={false}
        profileVisibility="PRIVATE"
        onFollow={onFollow}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Request" }));
    expect(onFollow).toHaveBeenCalledTimes(1);
  });

  it("calls onUnfollow when already following", () => {
    const onUnfollow = vi.fn();
    renderWithProviders(<FollowButton isFollowing onUnfollow={onUnfollow} />);

    fireEvent.click(screen.getByRole("button", { name: "Following" }));
    expect(onUnfollow).toHaveBeenCalledTimes(1);
  });

  it("stays clickable while a follow request is pending", () => {
    const onFollow = vi.fn();
    renderWithProviders(
      <FollowButton isFollowing={false} isPending onFollow={onFollow} />,
    );
    const button = screen.getByRole("button", { name: "Follow" });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onFollow).toHaveBeenCalledTimes(1);
  });
});
