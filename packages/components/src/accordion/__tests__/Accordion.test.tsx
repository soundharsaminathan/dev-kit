import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Disclosure,
  DisclosurePanel,
  DisclosureTrigger,
} from "../../disclosure/Disclosure";
import { Accordion } from "../Accordion";

describe("Accordion", () => {
  it("expands one disclosure at a time", () => {
    render(
      <Accordion>
        <Disclosure id="one">
          <DisclosureTrigger>Section one</DisclosureTrigger>
          <DisclosurePanel>Panel one</DisclosurePanel>
        </Disclosure>
        <Disclosure id="two">
          <DisclosureTrigger>Section two</DisclosureTrigger>
          <DisclosurePanel>Panel two</DisclosurePanel>
        </Disclosure>
      </Accordion>,
    );

    expect(screen.getByText("Panel one")).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Section one" }));
    expect(screen.getByText("Panel one")).toBeVisible();
    expect(screen.getByText("Panel two")).not.toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Section two" }));
    expect(screen.getByText("Panel one")).not.toBeVisible();
    expect(screen.getByText("Panel two")).toBeVisible();
  });

  it("allows multiple expanded disclosures", () => {
    render(
      <Accordion allowsMultipleExpanded defaultExpandedKeys={["one"]}>
        <Disclosure id="one">
          <DisclosureTrigger>Section one</DisclosureTrigger>
          <DisclosurePanel>Panel one</DisclosurePanel>
        </Disclosure>
        <Disclosure id="two">
          <DisclosureTrigger>Section two</DisclosureTrigger>
          <DisclosurePanel>Panel two</DisclosurePanel>
        </Disclosure>
      </Accordion>,
    );

    expect(screen.getByText("Panel one")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Section two" }));
    expect(screen.getByText("Panel one")).toBeVisible();
    expect(screen.getByText("Panel two")).toBeVisible();
  });
});
