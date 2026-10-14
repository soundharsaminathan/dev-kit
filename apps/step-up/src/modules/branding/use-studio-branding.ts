import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { uploadSocialPhoto } from "@/modules/social/upload";
import { BRAND_IMAGE_CROPS, type BrandImageKind } from "./brand-image-crops";

export type HeroSlot = "heroMobileUrl" | "heroDesktopUrl";

type PendingCrop = {
  file: File;
  kind: BrandImageKind;
};

export function useStudioBranding(studioId: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("BrandingPanel");
  const [logoError, setLogoError] = useState<string | null>(null);
  const [heroError, setHeroError] = useState<string | null>(null);
  const [pendingCrop, setPendingCrop] = useState<PendingCrop | null>(null);

  const invalidateStudio = () => {
    if (!studioId) return;
    void queryClient.invalidateQueries({ queryKey: ["studio", studioId] });
    void queryClient.invalidateQueries({
      queryKey: ["studio-public", studioId],
    });
    void queryClient.invalidateQueries({ queryKey: ["home"] });
  };

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const nextLogoUrl = await uploadSocialPhoto(api, file, "studio-logo");
      return api.patch(`/studios/${studioId}`, { logoUrl: nextLogoUrl });
    },
    onSuccess: () => {
      setLogoError(null);
      setPendingCrop(null);
      invalidateStudio();
      toast({
        title: "Logo uploaded",
        description: "Studio logo updated.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      const description =
        error instanceof Error ? error.message : "Could not upload logo.";
      setLogoError(description);
      toast({
        title: "Couldn’t upload logo",
        description,
        variant: "error",
      });
    },
  });

  const removeLogo = useMutation({
    mutationFn: () => api.patch(`/studios/${studioId}`, { logoUrl: null }),
    onSuccess: () => {
      setLogoError(null);
      invalidateStudio();
      toast({
        title: "Logo removed",
        description: "Studio logo cleared.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      const description =
        error instanceof Error ? error.message : "Could not remove logo.";
      setLogoError(description);
      toast({
        title: "Couldn’t remove logo",
        description,
        variant: "error",
      });
    },
  });

  const uploadHero = useMutation({
    mutationFn: async ({ slot, file }: { slot: HeroSlot; file: File }) => {
      const nextUrl = await uploadSocialPhoto(api, file, "studio-hero");
      return api.patch(`/studios/${studioId}`, { [slot]: nextUrl });
    },
    onSuccess: (_result, variables) => {
      setHeroError(null);
      setPendingCrop(null);
      invalidateStudio();
      toast({
        title: "Hero image uploaded",
        description:
          variables.slot === "heroMobileUrl"
            ? "Mobile hero updated for the member home screen."
            : "Desktop hero updated for the member home screen.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      const description =
        error instanceof Error ? error.message : "Could not upload hero image.";
      setHeroError(description);
      toast({
        title: "Couldn’t upload hero",
        description,
        variant: "error",
      });
    },
  });

  const removeHero = useMutation({
    mutationFn: (slot: HeroSlot) =>
      api.patch(`/studios/${studioId}`, { [slot]: null }),
    onSuccess: (_result, slot) => {
      setHeroError(null);
      invalidateStudio();
      toast({
        title: "Hero image removed",
        description:
          slot === "heroMobileUrl"
            ? "Mobile hero cleared."
            : "Desktop hero cleared.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      const description =
        error instanceof Error ? error.message : "Could not remove hero image.";
      setHeroError(description);
      toast({
        title: "Couldn’t remove hero",
        description,
        variant: "error",
      });
    },
  });

  function openCrop(kind: BrandImageKind, file: File) {
    setPendingCrop({ kind, file });
  }

  function handleCropDone(file: File) {
    if (!pendingCrop) return;
    if (pendingCrop.kind === "logo") {
      uploadLogo.mutate(file);
      return;
    }
    uploadHero.mutate({
      slot:
        pendingCrop.kind === "heroMobile" ? "heroMobileUrl" : "heroDesktopUrl",
      file,
    });
  }

  const heroUploadingSlot =
    uploadHero.isPending && uploadHero.variables
      ? uploadHero.variables.slot
      : null;
  const heroRemovingSlot =
    removeHero.isPending && removeHero.variables ? removeHero.variables : null;
  const cropBusy =
    uploadLogo.isPending ||
    (uploadHero.isPending &&
      pendingCrop != null &&
      pendingCrop.kind !== "logo");
  const cropConfig = pendingCrop
    ? BRAND_IMAGE_CROPS[pendingCrop.kind]
    : BRAND_IMAGE_CROPS.logo;

  return {
    logoError,
    heroError,
    pendingCrop,
    cropConfig,
    cropBusy,
    openCrop,
    handleCropDone,
    cancelCrop: () => {
      if (!cropBusy) setPendingCrop(null);
    },
    uploadLogoPending: uploadLogo.isPending,
    removeLogoPending: removeLogo.isPending,
    removeLogo: () => removeLogo.mutate(),
    heroUploadingSlot,
    heroRemovingSlot,
    removeHero: (slot: HeroSlot) => removeHero.mutate(slot),
  };
}
