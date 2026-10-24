import type { PokeType, Rarity } from "../types";

export interface TypeMeta {
  label: string;
  color: string;
  dark: string;
  light: string;
  symbol: string;
}

export const TYPE_META: Record<PokeType, TypeMeta> = {
  fire: { label: "Fire", color: "#F08030", dark: "#9C531F", light: "#F8C49A", symbol: "🔥" },
  water: { label: "Water", color: "#6890F0", dark: "#445E9C", light: "#B4C8F7", symbol: "💧" },
  electric: { label: "Electric", color: "#F8D030", dark: "#A1871F", light: "#FBE68E", symbol: "⚡" },
  grass: { label: "Grass", color: "#78C850", dark: "#4E8234", light: "#BDE3A8", symbol: "🍃" },
  psychic: { label: "Psychic", color: "#F85888", dark: "#A13959", light: "#FBADC4", symbol: "🔮" },
  fighting: { label: "Fighting", color: "#C03028", dark: "#7D1F1A", light: "#E0A09C", symbol: "👊" },
  ice: { label: "Ice", color: "#98D8D8", dark: "#638D8D", light: "#D4EFEF", symbol: "❄️" },
  dragon: { label: "Dragon", color: "#7038F8", dark: "#4924A1", light: "#BDA2FB", symbol: "🐉" },
  normal: { label: "Normal", color: "#A8A878", dark: "#6D6D4E", light: "#D6D6BE", symbol: "⭐" },
  fairy: { label: "Fairy", color: "#EE99AC", dark: "#9B6470", light: "#F7CDD6", symbol: "✨" },
};

export const RARITY_META: Record<Rarity, { label: string; symbol: string; baseValue: number }> = {
  common: { label: "Common", symbol: "●", baseValue: 10 },
  rare: { label: "Rare", symbol: "◆", baseValue: 30 },
  holo: { label: "Holo Rare", symbol: "★", baseValue: 60 },
  ultra: { label: "Ultra Rare", symbol: "★★", baseValue: 120 },
};
