import type { ShareCardLayoutId } from "./types";

export type ShareCardLayoutTokens = {
  id: ShareCardLayoutId;
  defaultAccent: string;
  background: string;
  text: string;
  mutedText: string;
  ctaBg: string;
  ctaText: string;
  headlineSize: number;
  batchNameSize: number;
  metaSize: number;
  studioNameSize: number;
  ctaSize: number;
  paddingX: number;
  paddingTop: number;
  paddingBottom: number;
  logoSize: number;
  heroRatio: number;
  frameInset: number;
};

export const LAYOUT_TOKENS: Record<ShareCardLayoutId, ShareCardLayoutTokens> = {
  fullBleed: {
    id: "fullBleed",
    defaultAccent: "#E4572E",
    background: "#0F0E0C",
    text: "#FFFFFF",
    mutedText: "rgba(255,255,255,0.78)",
    ctaBg: "#FFFFFF",
    ctaText: "#0F0E0C",
    headlineSize: 72,
    batchNameSize: 64,
    metaSize: 34,
    studioNameSize: 28,
    ctaSize: 36,
    paddingX: 72,
    paddingTop: 96,
    paddingBottom: 96,
    logoSize: 96,
    heroRatio: 1,
    frameInset: 0,
  },
  heroBand: {
    id: "heroBand",
    defaultAccent: "#6C63FF",
    background: "#F7F3EC",
    text: "#16140F",
    mutedText: "rgba(22,20,15,0.68)",
    ctaBg: "#16140F",
    ctaText: "#FFFFFF",
    headlineSize: 56,
    batchNameSize: 58,
    metaSize: 32,
    studioNameSize: 30,
    ctaSize: 34,
    paddingX: 72,
    paddingTop: 72,
    paddingBottom: 88,
    logoSize: 88,
    heroRatio: 0.45,
    frameInset: 0,
  },
  studioFrame: {
    id: "studioFrame",
    defaultAccent: "#0A7C6E",
    background: "#141312",
    text: "#F8F4EC",
    mutedText: "rgba(248,244,236,0.72)",
    ctaBg: "#F8F4EC",
    ctaText: "#141312",
    headlineSize: 48,
    batchNameSize: 54,
    metaSize: 30,
    studioNameSize: 36,
    ctaSize: 34,
    paddingX: 80,
    paddingTop: 88,
    paddingBottom: 88,
    logoSize: 120,
    heroRatio: 0.38,
    frameInset: 72,
  },
};
