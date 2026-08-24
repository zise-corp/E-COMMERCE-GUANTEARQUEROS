/**
 * Assets de marca.
 *
 * El escudo real vive en `public/brand/escudo-guantearqueros.svg` (vectorizado del
 * PNG original que pasó el dueño, ver referencias/logo-original).
 *
 * El wordmark y el logo de DREI todavía NO llegaron como archivo. Hasta que lleguen,
 * el wordmark se compone con Anton igual que en el prototipo. Cuando el dueño entregue
 * `wordmark-guantearqueros.svg` / `drei-athletic.svg`, se dejan en `public/brand/` y se
 * pone el flag en true: los componentes cambian solos, sin tocar el layout.
 *
 * Regla del handoff: el wordmark real NO se re-tipografía.
 */
export const brandAssets = {
  escudoSvg: "/brand/escudo-guantearqueros.svg",
  escudoPng: "/brand/escudo-guantearqueros.png",
  hasWordmarkSvg: false,
  wordmarkSvg: "/brand/wordmark-guantearqueros.svg",
  hasDreiSvg: false,
  dreiSvg: "/brand/drei-athletic.svg",
} as const;

/** Tamaño óptico fijado en el handoff. */
export const ESCUDO_SIZES = {
  header: { width: 34, height: 40 },
  adminSidebar: { width: 24, height: 29 },
  login: { width: 28, height: 33 },
} as const;
