/** @deprecated Use greet instead */
export function legacyGreet(name: string): string {
  return `Hello, ${name}`;
}

export function greet(name: string): string {
  return legacyGreet(name);
}
