/** Simple SM-2 spaced repetition, per item and per skill. */

export type Skill = "recognize" | "sound" | "write";

export interface Card {
  id: string;
  ef: number;
  reps: number;
  interval: number;
  due: number;
  last: number;
  lapses: number;
  introduced: boolean;
  hintCount: number;
}

export function cardId(wordId: string, skill: Skill): string {
  return `${wordId}::${skill}`;
}

export function parseCardId(id: string): { wordId: string; skill: Skill } {
  const [wordId, skill] = id.split("::");
  return { wordId, skill: (skill || "recognize") as Skill };
}

export function newCard(id: string, now = Date.now()): Card {
  return { id, ef: 2.5, reps: 0, interval: 0, due: now, last: 0, lapses: 0, introduced: false, hintCount: 0 };
}

/** quality: 0 again, 2 hard/hint, 3 good, 5 easy. Hint should pass <= 2 so the card returns sooner. */
export function review(card: Card, quality: number, now = Date.now()): Card {
  const q = Math.max(0, Math.min(5, quality));
  const next: Card = { ...card, last: now, introduced: true };
  if (q < 3) {
    next.reps = 0;
    next.interval = q <= 0 ? 0 : 0.25; // same session or later today (~6h)
    next.due = now + next.interval * 86400000;
    next.lapses += 1;
    if (q <= 2) next.hintCount += q === 2 ? 1 : 0;
    next.ef = Math.max(1.3, next.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    return next;
  }
  if (next.reps === 0) next.interval = 1;
  else if (next.reps === 1) next.interval = 3;
  else next.interval = Math.round(next.interval * next.ef * 10) / 10;
  if (q === 2) next.interval = Math.max(0.3, next.interval * 0.5);
  if (q >= 5) next.interval = next.interval * 1.15;
  next.reps += 1;
  next.ef = Math.max(1.3, next.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  next.due = now + next.interval * 86400000;
  return next;
}

export function dueCards(all: Record<string, Card>, now = Date.now()): Card[] {
  return Object.values(all).filter((c) => c.due <= now).sort((a, b) => a.due - b.due);
}

export function introduce(card: Card, now = Date.now()): Card {
  if (card.introduced) return card;
  return { ...card, introduced: true, last: now, due: now + 10 * 60000 };
}
