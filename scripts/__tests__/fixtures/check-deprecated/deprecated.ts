/** @deprecated Use greet instead */
export function legacyGreet(name: string): string {
  return `Hello, ${name}`;
}

/** @deprecated Use farewell instead */
export function legacyFarewell(name: string): string {
  return `Bye, ${name}`;
}

export function greet(name: string): string {
  return legacyGreet(name);
}
