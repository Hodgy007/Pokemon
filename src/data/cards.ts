import type { CardData } from "../types";
import { RARITY_META } from "./typeMeta";

export const CARDS: CardData[] = [
  {
    id: "pikachu", dex: 25, name: "Pikachu", type: "electric", hp: 70, stage: "Basic", rarity: "rare",
    attacks: [
      { name: "Quick Attack", cost: ["normal"], damage: 20, effect: "normal" },
      { name: "Thunderbolt", cost: ["electric", "electric", "normal"], damage: 120, text: "Discard all Energy from this Pokémon." },
    ],
    flavor: "When several of these Pokémon gather, their electricity can build and cause lightning storms.",
  },
  {
    id: "charizard", dex: 6, name: "Charizard", type: "fire", hp: 180, stage: "Stage 2", rarity: "ultra",
    ability: { name: "Blaze Aura", text: "While this Pokémon has half HP or less, its attacks do 30 more damage." },
    attacks: [{ name: "Fire Spin", cost: ["fire", "fire", "fire", "normal"], damage: 200, text: "Discard 2 Energy from this Pokémon." }],
    flavor: "It spits fire that is hot enough to melt boulders. It may cause forest fires by blowing flames.",
  },
  {
    id: "blastoise", dex: 9, name: "Blastoise", type: "water", hp: 160, stage: "Stage 2", rarity: "holo",
    ability: { name: "Rain Dance", text: "Once during your turn, you may attach a Water Energy from your hand." },
    attacks: [{ name: "Hydro Pump", cost: ["water", "water", "normal"], damage: 140 }],
    flavor: "It crushes its foe under its heavy body to cause fainting. In a pinch, it will withdraw inside its shell.",
  },
  {
    id: "venusaur", dex: 3, name: "Venusaur", type: "grass", hp: 170, stage: "Stage 2", rarity: "holo",
    ability: { name: "Overgrow", text: "Grass attacks used by this Pokémon do 20 more damage." },
    attacks: [
      { name: "Razor Leaf", cost: ["grass", "normal"], damage: 60 },
      { name: "Solar Beam", cost: ["grass", "grass", "grass", "normal"], damage: 150 },
    ],
    flavor: "Its plant blooms when it is absorbing solar energy. It stays on the move to seek sunlight.",
  },
  {
    id: "mewtwo", dex: 150, name: "Mewtwo", type: "psychic", hp: 150, stage: "Basic", rarity: "ultra",
    ability: { name: "Pressure", text: "Your opponent's attacks cost 1 more Energy." },
    attacks: [{ name: "Psystrike", cost: ["psychic", "psychic", "normal"], damage: 160, text: "Ignores effects on the Defending Pokémon." }],
    flavor: "It was created by a scientist after years of horrific gene splicing and DNA engineering experiments.",
  },
  {
    id: "gengar", dex: 94, name: "Gengar", type: "psychic", hp: 130, stage: "Stage 2", rarity: "holo",
    attacks: [
      { name: "Hypnosis", cost: ["psychic"], damage: 0, text: "The Defending Pokémon is now Asleep." },
      { name: "Shadow Ball", cost: ["psychic", "psychic", "normal"], damage: 110 },
    ],
    flavor: "On the night of a full moon, if shadows move on their own and laugh, it must be Gengar's doing.",
  },
  {
    id: "machamp", dex: 68, name: "Machamp", type: "fighting", hp: 170, stage: "Stage 2", rarity: "rare",
    attacks: [
      { name: "Karate Chop", cost: ["fighting"], damage: 60 },
      { name: "Dynamic Punch", cost: ["fighting", "fighting", "normal"], damage: 150, text: "The Defending Pokémon is now Confused." },
    ],
    flavor: "Using its heavy muscles, it throws powerful punches that can send the victim clear over the horizon.",
  },
  {
    id: "lapras", dex: 131, name: "Lapras", type: "ice", hp: 130, stage: "Basic", rarity: "rare",
    attacks: [
      { name: "Surf", cost: ["water", "normal"], damage: 60, effect: "water" },
      { name: "Ice Beam", cost: ["ice", "ice", "normal"], damage: 90, text: "Flip a coin. If heads, the Defending Pokémon is Paralyzed." },
    ],
    flavor: "A gentle soul that can read the minds of people. It can ferry people across the sea on its back.",
  },
  {
    id: "dragonite", dex: 149, name: "Dragonite", type: "dragon", hp: 180, stage: "Stage 2", rarity: "ultra",
    ability: { name: "Multiscale", text: "If this Pokémon has full HP, it takes 50 less damage from attacks." },
    attacks: [{ name: "Outrage", cost: ["dragon", "dragon", "normal", "normal"], damage: 180 }],
    flavor: "It is said to make its home somewhere in the sea. It guides crews of shipwrecks to shore.",
  },
  {
    id: "snorlax", dex: 143, name: "Snorlax", type: "normal", hp: 150, stage: "Basic", rarity: "common",
    ability: { name: "Thick Fat", text: "This Pokémon takes 30 less damage from Fire and Ice attacks." },
    attacks: [{ name: "Body Slam", cost: ["normal", "normal", "normal"], damage: 90 }],
    flavor: "It is not satisfied unless it eats over 880 pounds of food every day. When it is done eating, it goes promptly to sleep.",
  },
  {
    id: "gyarados", dex: 130, name: "Gyarados", type: "water", hp: 160, stage: "Stage 1", rarity: "rare",
    attacks: [
      { name: "Waterfall", cost: ["water", "normal"], damage: 100 },
      { name: "Dragon Rage", cost: ["water", "water", "normal"], damage: 130, effect: "dragon" },
    ],
    flavor: "Once it appears, it goes on a rampage. It remains enraged until it demolishes everything around it.",
  },
  {
    id: "jolteon", dex: 135, name: "Jolteon", type: "electric", hp: 100, stage: "Stage 1", rarity: "common",
    attacks: [
      { name: "Pin Missile", cost: ["normal"], damage: 40, effect: "normal" },
      { name: "Thunder Fang", cost: ["electric", "normal"], damage: 70 },
    ],
    flavor: "It accumulates negative ions in the atmosphere to blast out 10,000-volt lightning bolts.",
  },
  {
    id: "lucario", dex: 448, name: "Lucario", type: "fighting", hp: 130, stage: "Stage 1", rarity: "holo",
    ability: { name: "Steadfast", text: "If this Pokémon is damaged, its next attack does 40 more damage." },
    attacks: [{ name: "Aura Sphere", cost: ["fighting", "fighting", "normal"], damage: 120 }],
    flavor: "By reading the auras of all things, it can tell how others are feeling from over half a mile away.",
  },
  {
    id: "sylveon", dex: 700, name: "Sylveon", type: "fairy", hp: 120, stage: "Stage 1", rarity: "holo",
    ability: { name: "Pixilate", text: "This Pokémon's Normal attacks count as Fairy attacks." },
    attacks: [{ name: "Moonblast", cost: ["fairy", "fairy", "normal"], damage: 110 }],
    flavor: "It wraps its ribbon-like feelers around the arm of its beloved Trainer and walks with them.",
  },
  {
    id: "rayquaza", dex: 384, name: "Rayquaza", type: "dragon", hp: 200, stage: "Basic", rarity: "ultra",
    ability: { name: "Air Lock", text: "Stadium cards in play have no effect." },
    attacks: [{ name: "Dragon Ascent", cost: ["dragon", "dragon", "electric", "normal"], damage: 230 }],
    flavor: "It lives in the ozone layer far above the clouds and cannot be seen from the ground.",
  },
  {
    id: "glaceon", dex: 471, name: "Glaceon", type: "ice", hp: 110, stage: "Stage 1", rarity: "common",
    attacks: [
      { name: "Ice Shard", cost: ["ice"], damage: 30 },
      { name: "Blizzard", cost: ["ice", "ice", "normal"], damage: 110 },
    ],
    flavor: "It can control its body temperature at will. This enables it to freeze the moisture in the atmosphere.",
  },
  {
    id: "bulbasaur", dex: 1, name: "Bulbasaur", type: "grass", hp: 70, stage: "Basic", rarity: "common",
    attacks: [{ name: "Vine Whip", cost: ["grass", "normal"], damage: 30 }],
    flavor: "A strange seed was planted on its back at birth. The plant sprouts and grows with this Pokémon.",
  },
  {
    id: "charmander", dex: 4, name: "Charmander", type: "fire", hp: 70, stage: "Basic", rarity: "common",
    attacks: [
      { name: "Scratch", cost: ["normal"], damage: 10, effect: "normal" },
      { name: "Ember", cost: ["fire", "normal"], damage: 40 },
    ],
    flavor: "The flame on its tail shows the strength of its life force. If it is weak, the flame also burns weakly.",
  },
  {
    id: "squirtle", dex: 7, name: "Squirtle", type: "water", hp: 70, stage: "Basic", rarity: "common",
    attacks: [
      { name: "Bubble", cost: ["water"], damage: 20 },
      { name: "Water Gun", cost: ["water", "normal"], damage: 40 },
    ],
    flavor: "After birth, its back swells and hardens into a shell. It powerfully sprays foam from its mouth.",
  },
  {
    id: "eevee", dex: 133, name: "Eevee", type: "normal", hp: 60, stage: "Basic", rarity: "common",
    attacks: [
      { name: "Tackle", cost: ["normal"], damage: 10 },
      { name: "Swift", cost: ["normal", "normal"], damage: 30 },
    ],
    flavor: "Its genetic code is irregular. It may mutate if it is exposed to radiation from element stones.",
  },
];

/** Cards the app knows about: the built-in set, replaced by the database's once it loads. */
let byId = new Map(CARDS.map((c) => [c.id, c]));

export function setKnownCards(cards: CardData[]) {
  byId = new Map(cards.map((c) => [c.id, c]));
}

export function findCard(id: string): CardData | undefined {
  return byId.get(id);
}

export function getCard(id: string): CardData {
  const card = byId.get(id);
  if (!card) throw new Error(`Unknown card: ${id}`);
  return card;
}

/** Trade value in points, used to judge how fair an offer is. */
export function cardValue(card: CardData): number {
  return RARITY_META[card.rarity].baseValue + Math.round(card.hp / 10);
}

export function artworkUrl(card: CardData): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${card.dex}.png`;
}

/** The move shown first when a card is opened: its strongest attack. */
export function signatureAttack(card: CardData) {
  return card.attacks.reduce((best, a) => (a.damage > best.damage ? a : best));
}
