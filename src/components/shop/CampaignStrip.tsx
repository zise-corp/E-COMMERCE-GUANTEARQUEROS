import type { CampaignSettings } from "@/db/queries/settings";

/**
 * Franja de campaña: 42px, franjas diagonales de marca y marquee de 26s.
 * Se apaga desde el admin (site_settings.campaign).
 */
export function CampaignStrip({ campaign }: { campaign: CampaignSettings }) {
  if (!campaign.enabled || campaign.messages.length === 0) return null;

  // El marquee recorre -50%: el contenido va duplicado para que el loop no corte.
  const loop = [...campaign.messages, ...campaign.messages];
  const track = [...loop, ...loop];

  return (
    <div
      className="flex h-[42px] items-center overflow-hidden border-b border-line bg-stripe-danger"
      role="marquee"
      aria-label="Campaña vigente"
    >
      <div className="flex w-[200%] animate-marquee">
        {track.map((text, i) => (
          <div key={i} className="flex items-center gap-3.5 whitespace-nowrap px-[22px]">
            <span className="bg-ink-950 px-2.5 py-1 font-display text-[17px] tracking-[0.06em] text-content skew-fast-8">
              {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
