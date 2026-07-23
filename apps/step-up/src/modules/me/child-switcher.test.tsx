import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActiveStudentContext } from "@/modules/me/active-student-context";
import { renderWithProviders } from "@/test/render";
import { ChildSwitcher } from "./child-switcher";

describe("ChildSwitcher", () => {
  it("renders nothing when not managing a family", () => {
    renderWithProviders(
      <ActiveStudentContext.Provider
        value={
          {
            accounts: [],
            studentId: null,
            setActiveAccount: vi.fn(),
            isManagingFamily: false,
          } as never
        }
      >
        <ChildSwitcher />
      </ActiveStudentContext.Provider>,
    );

    expect(screen.queryByRole("group")).toBeNull();
  });

  it("switches the active child", () => {
    const setActiveAccount = vi.fn();
    renderWithProviders(
      <ActiveStudentContext.Provider
        value={
          {
            accounts: [
              { id: "parent-1", name: "Jamie Parent", isSelf: true },
              { id: "student-1", name: "Alex Student", isSelf: false },
            ],
            studentId: "parent-1",
            setActiveAccount,
            isManagingFamily: true,
          } as never
        }
      >
        <ChildSwitcher />
      </ActiveStudentContext.Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Alex" }));
    expect(setActiveAccount).toHaveBeenCalledWith("student-1");
  });
});
