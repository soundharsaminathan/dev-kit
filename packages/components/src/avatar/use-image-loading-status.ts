import type { ImgHTMLAttributes } from "react";
import { useLayoutEffect, useState } from "react";

export type ImageLoadingStatus = "idle" | "loading" | "loaded" | "error";

type UseImageLoadingStatusOptions = {
  referrerPolicy?: ImgHTMLAttributes<HTMLImageElement>["referrerPolicy"];
  crossOrigin?: ImgHTMLAttributes<HTMLImageElement>["crossOrigin"];
};

export function useImageLoadingStatus(
  src: string | undefined,
  { referrerPolicy, crossOrigin }: UseImageLoadingStatusOptions = {},
): ImageLoadingStatus {
  const [loadingStatus, setLoadingStatus] =
    useState<ImageLoadingStatus>("idle");

  useLayoutEffect(() => {
    if (!src) {
      setLoadingStatus("error");
      return;
    }

    let isMounted = true;
    const image = new window.Image();

    const updateStatus = (status: ImageLoadingStatus) => () => {
      if (isMounted) {
        setLoadingStatus(status);
      }
    };

    setLoadingStatus("loading");
    image.onload = updateStatus("loaded");
    image.onerror = updateStatus("error");
    if (referrerPolicy) {
      image.referrerPolicy = referrerPolicy;
    }
    image.crossOrigin = crossOrigin ?? null;
    image.src = src;

    return () => {
      isMounted = false;
    };
  }, [src, crossOrigin, referrerPolicy]);

  return loadingStatus;
}
