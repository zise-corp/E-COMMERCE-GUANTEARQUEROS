"use client";

import { Input, Select, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { DEPARTMENTS, LOCAL_DEPARTMENT, type Department } from "@/lib/site";
import { shippingSchema } from "@/lib/validators";
import { LocationPicker } from "./LocationPicker";

export type ShippingValues = {
  name: string;
  phone: string;
  note: string;
  mode: "pickup" | "delivery";
  department: Department | null;
  address: string;
  lat: number | null;
  lng: number | null;
  mapsUrl: string;
  documentId: string;
  email: string;
};

export const emptyShipping: ShippingValues = {
  name: "",
  phone: "",
  note: "",
  mode: "pickup",
  department: null,
  address: "",
  lat: null,
  lng: null,
  mapsUrl: "",
  documentId: "",
  email: "",
};

export type FieldErrors = Partial<Record<keyof ShippingValues, string>>;

export function validate(values: ShippingValues): { ok: boolean; errors: FieldErrors } {
  const result = shippingSchema.safeParse(values);
  if (result.success) return { ok: true, errors: {} };

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in errors)) {
      errors[key as keyof ShippingValues] = issue.message;
    }
  }
  return { ok: false, errors };
}

export function describeDelivery(v: ShippingValues): string {
  if (v.mode === "pickup") return "Retiro en el local · Cochabamba";
  if (!v.department) return "Envío a domicilio · elegí el departamento";
  return v.department === LOCAL_DEPARTMENT
    ? "Envío a domicilio · Cochabamba (logística propia)"
    : `Envío a domicilio · ${v.department} (por transporte)`;
}

export function ShippingForm({
  value,
  onChange,
  showErrors,
}: {
  value: ShippingValues;
  onChange: (next: ShippingValues) => void;
  showErrors: boolean;
}) {
  const { errors } = validate(value);
  const err = (key: keyof ShippingValues) => (showErrors ? errors[key] : undefined);
  const set = <K extends keyof ShippingValues>(key: K, next: ShippingValues[K]) =>
    onChange({ ...value, [key]: next });

  const isDelivery = value.mode === "delivery";
  const isLocal = isDelivery && value.department === LOCAL_DEPARTMENT;
  const isOther = isDelivery && value.department !== null && value.department !== LOCAL_DEPARTMENT;

  return (
    <div className="flex flex-col gap-3.5 px-6 pb-2 pt-5">
      <Input
        label="Nombre"
        required
        placeholder="Nombre y apellido"
        autoComplete="name"
        value={value.name}
        error={err("name")}
        onChange={(e) => set("name", e.target.value)}
      />

      <Input
        label="Teléfono / WhatsApp"
        required
        type="tel"
        inputMode="tel"
        placeholder="+591 7xx xx xxx"
        autoComplete="tel"
        value={value.phone}
        error={err("phone")}
        onChange={(e) => set("phone", e.target.value)}
      />

      <Textarea
        label="Nota (opcional)"
        rows={2}
        placeholder="Referencia, horario, color preferido..."
        value={value.note}
        error={err("note")}
        onChange={(e) => set("note", e.target.value)}
      />

      <fieldset className="mt-1">
        <legend className="label-xs mb-[9px] text-content-dim">Modalidad de entrega</legend>
        <div className="grid grid-cols-2 gap-2">
          <ModeCard
            active={value.mode === "pickup"}
            title="Retiro en el local"
            detail="Cochabamba · sin costo"
            onClick={() => onChange({ ...value, mode: "pickup" })}
          />
          <ModeCard
            active={isDelivery}
            title="Envío a domicilio"
            detail="Todo el país"
            onClick={() =>
              onChange({
                ...value,
                mode: "delivery",
                department: value.department ?? LOCAL_DEPARTMENT,
              })
            }
          />
        </div>
      </fieldset>

      {isDelivery ? (
        <div className="flex flex-col gap-3.5 animate-rise">
          <Select
            label="Departamento"
            required
            value={value.department ?? ""}
            error={err("department")}
            onChange={(e) =>
              onChange({
                ...value,
                department: (e.target.value || null) as Department | null,
                // Cambiar de departamento borra los datos del otro camino.
                lat: null,
                lng: null,
                mapsUrl: "",
              })
            }
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>

          {isLocal ? (
            <div className="flex flex-col gap-3.5">
              <p className="border-l-[3px] border-brand bg-brand/[0.07] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#E8C8BC]">
                Reparto con logística propia en Cochabamba. Necesitamos la ubicación exacta.
              </p>

              <Input
                label="Dirección"
                required
                placeholder="Calle, número, zona"
                autoComplete="street-address"
                value={value.address}
                error={err("address")}
                onChange={(e) => set("address", e.target.value)}
              />

              <div>
                <p className="label-xs mb-[7px] text-content-dim">
                  Ubicación en el mapa<span className="text-brand"> *</span>
                </p>
                <LocationPicker
                  value={value.lat !== null && value.lng !== null ? { lat: value.lat, lng: value.lng } : null}
                  error={err("lat")}
                  onChange={(next, mapsUrl) =>
                    onChange({
                      ...value,
                      lat: next?.lat ?? null,
                      lng: next?.lng ?? null,
                      mapsUrl: mapsUrl ?? value.mapsUrl,
                    })
                  }
                />
              </div>
            </div>
          ) : null}

          {isOther ? (
            <div className="flex flex-col gap-3.5 animate-rise">
              <p className="border-l-[3px] border-drei-line bg-drei-line/[0.09] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-drei-ink">
                El envío se despacha por empresa de transporte. Coordinamos la agencia y el pago
                del flete por WhatsApp.
              </p>

              <Input
                label="CI / Documento"
                required
                placeholder="Número de carnet"
                value={value.documentId}
                error={err("documentId")}
                onChange={(e) => set("documentId", e.target.value)}
              />

              <Input
                label="Correo electrónico"
                required
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="tucorreo@mail.com"
                value={value.email}
                error={err("email")}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ModeCard({
  active,
  title,
  detail,
  onClick,
}: {
  active: boolean;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "border p-[15px_14px] text-left transition-colors duration-150",
        active ? "border-brand bg-brand/[0.09]" : "border-line-strong bg-[#0F0F0E] hover:border-[#3A3A38]",
      )}
    >
      <span className={cn("block text-[13.5px] font-extrabold", active ? "text-brand" : "text-content")}>
        {title}
      </span>
      <span className="mt-[3px] block text-[11.5px] text-[#8A8783]">{detail}</span>
    </button>
  );
}
