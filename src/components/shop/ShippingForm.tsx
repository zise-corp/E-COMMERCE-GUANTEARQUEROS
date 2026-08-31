"use client";

import { Input, Select, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { DEPARTMENTS, LOCAL_DEPARTMENT, type Department } from "@/lib/site";
import { shippingSchema } from "@/lib/validators";
import { LocationPicker } from "./LocationPicker";

export type ShippingValues = {
  name: string;
  lastName: string;
  phone: string;
  note: string;
  invoiceRequested: boolean;
  businessName: string;
  taxId: string;
  mode: "" | "pickup" | "delivery";
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
  lastName: "",
  phone: "",
  note: "",
  invoiceRequested: false,
  businessName: "",
  taxId: "",
  mode: "",
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
  if (!v.department) return "Elige el departamento";
  if (v.department === LOCAL_DEPARTMENT) {
    if (v.mode === "pickup") return "Retiro en el local · La Paz";
    if (v.mode === "delivery") return "Envío a domicilio · La Paz";
    return "Elige retiro en local o entrega";
  }
  return `Envío a ${v.department} por transporte`;
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

  const isLaPaz = value.department === LOCAL_DEPARTMENT;
  const isLocalDelivery = isLaPaz && value.mode === "delivery";
  const isOther = value.department !== null && !isLaPaz;

  function selectDepartment(department: Department | null) {
    onChange({
      ...value,
      department,
      // En La Paz el cliente debe escoger retiro o entrega. En los demás
      // departamentos el único flujo disponible es transporte.
      mode: department === null || department === LOCAL_DEPARTMENT ? "" : "delivery",
      lat: null,
      lng: null,
      mapsUrl: "",
      address: "",
      documentId: "",
      email: "",
    });
  }

  return (
    <div className="flex flex-col gap-3 px-6 pb-2 pt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Nombre(s)"
          required
          placeholder="Nombre"
          autoComplete="given-name"
          value={value.name}
          error={err("name")}
          onChange={(e) => set("name", e.target.value)}
        />

        <Input
          label="Apellido(s)"
          required
          placeholder="Apellido"
          autoComplete="family-name"
          value={value.lastName}
          error={err("lastName")}
          onChange={(e) => set("lastName", e.target.value)}
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
          fieldClassName="sm:col-span-2"
        />
      </div>

      <Textarea
        label="Nota (opcional)"
        rows={1}
        placeholder="Referencia, horario, color preferido..."
        value={value.note}
        error={err("note")}
        onChange={(e) => set("note", e.target.value)}
      />

      <div className="mt-1 border border-line-strong bg-ink-950 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={value.invoiceRequested}
            onChange={(event) =>
              onChange({
                ...value,
                invoiceRequested: event.target.checked,
                ...(!event.target.checked ? { businessName: "", taxId: "" } : {}),
              })
            }
            className="mt-0.5 h-4 w-4 accent-brand"
          />
          <span>
            <span className="block text-[13.5px] font-extrabold text-content">¿Deseas factura?</span>
            <span className="mt-0.5 block text-[11.5px] text-content-dim">Marca esta opción para ingresar tus datos de facturación.</span>
          </span>
        </label>

        {value.invoiceRequested ? (
          <div className="mt-4 grid gap-3 border-t border-ink-800 pt-4 sm:grid-cols-2 animate-rise">
            <Input
              label="Razón Social"
              required
              placeholder="Nombre o empresa"
              value={value.businessName}
              error={err("businessName")}
              onChange={(event) => set("businessName", event.target.value)}
            />
            <Input
              label="NIT"
              required
              inputMode="numeric"
              placeholder="Número de NIT"
              value={value.taxId}
              error={err("taxId")}
              onChange={(event) => set("taxId", event.target.value)}
            />
          </div>
        ) : null}
      </div>

      <Select
        label="Departamento"
        required
        value={value.department ?? ""}
        error={err("department")}
        onChange={(e) => selectDepartment((e.target.value || null) as Department | null)}
      >
        <option value="">Elige tu departamento…</option>
        {DEPARTMENTS.map((department) => (
          <option key={department} value={department}>
            {department}
            {department === LOCAL_DEPARTMENT ? " — retiro o envío a domicilio" : ""}
          </option>
        ))}
      </Select>

      {isLaPaz ? (
        <fieldset className="animate-rise">
          <legend className="label-xs mb-[9px] text-content-dim">
            Modalidad en La Paz<span className="text-brand"> *</span>
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <ModeCard
              active={value.mode === "pickup"}
              title="Retiro en el local"
              detail="Sucursal principal · sin costo"
              onClick={() =>
                onChange({
                  ...value,
                  mode: "pickup",
                  address: "",
                  lat: null,
                  lng: null,
                  mapsUrl: "",
                })
              }
            />
            <ModeCard
              active={value.mode === "delivery"}
              title="Envío a domicilio"
              detail="Marca tu ubicación"
              onClick={() => onChange({ ...value, mode: "delivery" })}
            />
          </div>
          {err("mode") ? <p className="mt-1.5 text-xs text-alert-soft">{err("mode")}</p> : null}
        </fieldset>
      ) : null}

      {isLocalDelivery ? (
        <div className="flex flex-col gap-3 animate-rise">
          <p className="border-l-[3px] border-brand bg-brand/[0.07] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#E8C8BC]">
            Envío a domicilio en La Paz. Necesitamos tu dirección y ubicación exacta.
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
        <div className="flex flex-col gap-3 animate-rise">
          <p className="border-l-[3px] border-drei-line bg-drei-line/[0.09] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-drei-ink">
            Para envíos fuera de La Paz solo necesitamos los datos del destinatario. El vendedor
            coordinará la empresa y la sucursal de transporte.
          </p>

          <Input
            label="CI / Documento"
            required
            placeholder="Ej. 1234567 LP"
            value={value.documentId}
            error={err("documentId")}
            hint="Lo piden en la agencia para entregar el paquete."
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
      <span className={cn("block text-[13.5px] font-extrabold", active ? "text-brand" : "text-content") }>
        {title}
      </span>
      <span className="mt-[3px] block text-[11.5px] text-[#8A8783]">{detail}</span>
    </button>
  );
}
