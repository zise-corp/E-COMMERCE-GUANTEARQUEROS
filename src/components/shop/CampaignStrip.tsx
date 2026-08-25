import type { CampaignSettings } from "@/db/queries/settings";

/**
 * Franja de campaña: 42px, franjas diagonales de marca y marquee en loop.
 * Se apaga desde el admin (site_settings.campaign).
 *
 * El loop es infinito y sin saltos porque se renderizan DOS mitades idénticas y
 * la animación desplaza exactamente -50%: cuando termina, la segunda mitad está
 * justo donde arrancó la primera, así que el corte es invisible.
 *
 * La clave es que ambas mitades midan lo mismo y que el ancho lo dé el contenido
 * (`w-max`), no un porcentaje fijo: con un `w-[200%]` arbitrario, un texto corto
 * deja un hueco vacío y uno largo se corta a mitad de ciclo.
 */
export function CampaignStrip({ campaign }: { campaign: CampaignSettings }) {
  const messages = campaign.messages.filter((m) => m.trim().length > 0);
  if (!campaign.enabled || messages.length === 0) return null;

  // Una mitad tiene que ser más ancha que la pantalla, o se vería el vacío entre
  // repeticiones. Con pocas frases se repiten hasta llegar a un mínimo razonable.
  const MIN_ITEMS = 8;
  const half: string[] = [];
  while (half.length < MIN_ITEMS) half.push(...messages);

  return (
    <div
      className="flex h-[42px] items-center overflow-hidden border-b border-line bg-stripe-danger"
      aria-label="Campaña vigente"
    >
      <div className="flex w-max shrink-0 animate-marquee motion-reduce:animate-none">
        {[0, 1].map((copia) => (
          <div key={copia} className="flex shrink-0" aria-hidden={copia === 1}>
            {half.map((text, i) => (
              <span
                key={`${copia}-${i}`}
                className="flex shrink-0 items-center whitespace-nowrap px-[22px]"
              >
                <span className="bg-ink-950 px-2.5 py-1 font-display text-[17px] tracking-[0.06em] text-content skew-fast-8">
                  {text}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
