export type BrandingCompletionItem = {
  id: "logo" | "heroMobile" | "heroDesktop";
  label: string;
  done: boolean;
};

export function studioBrandingCompletion(input: {
  hasLogo: boolean;
  hasMobileHero: boolean;
  hasDesktopHero: boolean;
}): { items: BrandingCompletionItem[]; percent: number } {
  const items: BrandingCompletionItem[] = [
    { id: "logo", label: "Logo", done: input.hasLogo },
    { id: "heroMobile", label: "Mobile hero", done: input.hasMobileHero },
    { id: "heroDesktop", label: "Desktop hero", done: input.hasDesktopHero },
  ];
  const done = items.filter((item) => item.done).length;
  return {
    items,
    percent: Math.round((done / items.length) * 100),
  };
}
