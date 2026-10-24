import type { PokeType, Rarity } from "../types";

export interface TypeMeta {
  label: string;
  color: string;
  dark: string;
  light: string;
  /** Energy symbol drawn in a 24×24 box, in white on the type colour. */
  glyph: string;
  /** Draw the glyph as a stroke rather than a fill. */
  stroke?: boolean;
}

export const TYPE_META: Record<PokeType, TypeMeta> = {
  fire: {
    label: "Fire", color: "#F08030", dark: "#9C531F", light: "#F8C49A",
    glyph: "M12 2c.6 3.6 4.8 5.6 4.8 10.6a4.8 4.8 0 0 1-9.6 0c0-2.4 1.4-3.6 1.8-6 1.8 1.2 2.6 2.8 2.6 4.6 1.4-2 1.2-5.6.4-9.2z",
  },
  water: {
    label: "Water", color: "#6890F0", dark: "#445E9C", light: "#B4C8F7",
    glyph: "M12 2.5c3.2 4.8 6 7.8 6 11.3a6 6 0 0 1-12 0c0-3.5 2.8-6.5 6-11.3z",
  },
  electric: {
    label: "Electric", color: "#F8D030", dark: "#A1871F", light: "#FBE68E",
    glyph: "M13.5 2 5 13.6h6.2L10.2 22 19 10.2h-6.3z",
  },
  grass: {
    label: "Grass", color: "#78C850", dark: "#4E8234", light: "#BDE3A8",
    glyph: "M4.5 19.5C4.5 10 10.6 4.5 19.5 4.5c0 8.9-5.5 15-15 15zm1.6-1.6 8-8-.9-.9-8 8z",
  },
  psychic: {
    label: "Psychic", color: "#F85888", dark: "#A13959", light: "#FBADC4",
    glyph: "M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12zm10 3.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8z",
  },
  fighting: {
    label: "Fighting", color: "#C03028", dark: "#7D1F1A", light: "#E0A09C",
    glyph: "M12 2l2.2 6 6.3-2.1-3.6 5.4 5.1 3.2-6.3.8.8 6.3-4.5-4.5-4.5 4.5.8-6.3-6.3-.8 5.1-3.2-3.6-5.4L9.8 8z",
  },
  ice: {
    label: "Ice", color: "#98D8D8", dark: "#638D8D", light: "#D4EFEF",
    glyph: "M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M12 3l-2 2m2-2 2 2M12 21l-2-2m2 2 2-2",
    stroke: true,
  },
  dragon: {
    label: "Dragon", color: "#7038F8", dark: "#4924A1", light: "#BDA2FB",
    glyph: "M13.5 2.5C9 5.8 6.8 9.6 7.8 14.4c.7 3.3 3.6 5.9 8.4 6.6-2.6-2.2-3.4-5-2.6-8 .8-2.9 3.4-4.2 5.4-5.8-2.8.1-4.9-1.3-5.5-4.7z",
  },
  normal: {
    label: "Normal", color: "#A8A878", dark: "#6D6D4E", light: "#D6D6BE",
    glyph: "M12 2.5l2.9 6.4 7 .7-5.2 4.7 1.5 6.9L12 17.6l-6.2 3.6 1.5-6.9L2.1 9.6l7-.7z",
  },
  fairy: {
    label: "Fairy", color: "#EE99AC", dark: "#9B6470", light: "#F7CDD6",
    glyph: "M12 2c.9 5.6 4.4 9.1 10 10-5.6.9-9.1 4.4-10 10-.9-5.6-4.4-9.1-10-10 5.6-.9 9.1-4.4 10-10z",
  },
};

export const RARITY_META: Record<Rarity, { label: string; baseValue: number }> = {
  common: { label: "Common", baseValue: 10 },
  rare: { label: "Rare", baseValue: 30 },
  holo: { label: "Holo rare", baseValue: 60 },
  ultra: { label: "Ultra rare", baseValue: 120 },
};
