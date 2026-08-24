/** Une clases ignorando falsy. Sin tailwind-merge: el orden lo decide quien llama. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
