/**
 * Upbeat one-liners for the demo dashboard header. `{name}` is replaced with a
 * random first name (see names.ts). Picked at random per request.
 */
export const GREETINGS: string[] = [
  "Good news, {name}.",
  "Look at you go, {name}.",
  "You're on a roll, {name}.",
  "Big day, {name}.",
  "The numbers are in, {name}.",
  "Trending up, {name}.",
  "Nice work, {name}.",
  "Well played, {name}.",
  "Things are looking up, {name}.",
  "Someone's popular, {name}.",
  "Your traffic's looking sharp, {name}.",
  "Onwards and upwards, {name}.",
  "Crushing it, {name}.",
  "What a week, {name}.",
  "The people have spoken, {name}.",
  "Visitors are loving it, {name}.",
  "Momentum's on your side, {name}.",
  "Hot off the press, {name}.",
  "You've got fans, {name}.",
  "Green across the board, {name}.",
  "Keep it rolling, {name}.",
  "That's the good stuff, {name}.",
  "Numbers don't lie, {name}.",
  "Up and to the right, {name}.",
  "Look who's trending, {name}.",
  "Your hard work's paying off, {name}.",
  "Eyes on your site, {name}.",
  "The graph likes you, {name}.",
  "Fresh numbers, {name}.",
  "Right on track, {name}.",
  "Steady climb, {name}.",
  "People are showing up, {name}.",
  "Today's a good one, {name}.",
  "You're making waves, {name}.",
  "All systems up, {name}.",
  "Plenty to smile about, {name}.",
  "Word's getting out, {name}.",
  "Another day, another high, {name}.",
  "Feeling good about these, {name}.",
  "The internet found you, {name}.",
];

/** A random greeting with the name filled in. */
export function randomGreeting(name: string): string {
  const t = GREETINGS[Math.floor(Math.random() * GREETINGS.length)]!;
  return t.replace("{name}", name);
}
