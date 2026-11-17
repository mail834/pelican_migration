"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { dialCodes, type FormOption } from "@/lib/form-options";
import { timezoneCountry } from "@/lib/timezone-country";
export { destinations, qualifications, nationalities, referralSources } from "@/lib/form-options";

const box =
  "h-[3.25rem] w-full rounded-sm bg-light-200 px-5 t-body3 text-dark-300 placeholder:text-grey-300 outline-none border-[0.5px] border-transparent focus:border-grey-300 transition-colors";

/** icons/down — 15px box, arrow at its Figma insets. Pass `absolute …` to overlay it; it is `relative` otherwise. */
export function Chevron({ className = "" }: { className?: string }) {
  const position = /\babsolute\b/.test(className) ? "" : "relative";
  return (
    <span className={`${position} block size-[0.9375rem] shrink-0 ${className}`}>
      <img alt="" src="/icons/chevron-down.svg" className="absolute top-[30.42%] left-[15.83%] block h-[39.16%] w-[68.34%] max-w-none" />
    </span>
  );
}

export function TextInput({ className = "", ...props }: ComponentProps<"input">) {
  return <input aria-label={props["aria-label"] ?? props.placeholder} className={`${box} font-medium placeholder:font-normal ${className}`} {...props} />;
}

export function SelectInput({
  placeholder,
  options,
  className = "",
  value,
  defaultValue,
  ...props
}: { placeholder: string; options: (string | FormOption)[] } & ComponentProps<"select">) {
  return (
    <div className={`relative w-full ${className}`}>
      <select aria-label={props["aria-label"] ?? placeholder} {...(value === undefined ? { defaultValue: defaultValue ?? "" } : { value })} className={`${box} form-select cursor-pointer appearance-none pr-10`} required {...props}>
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o, index) => (
          <option key={index} value={typeof o === "string" ? o : o.value} className="text-dark-300">
            {typeof o === "string" ? o : o.label}
          </option>
        ))}
      </select>
      <Chevron className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2" />
    </div>
  );
}

// Dial-code list names that differ from the standard English region names.
const dialCodeAliases: Record<string, string> = {
  AE: "UAE", CD: "Congo DR", CG: "Congo", CZ: "Czech Republic", GB: "UK", HK: "Hong Kong", LC: "Saint Lucia",
  MK: "Macedonia", MM: "Myanmar", MO: "Macau", PS: "Palestine", TC: "Turks & Caicos", TR: "Turkey", US: "USA",
};
const GEO_KEY = "pelican-visitor-country";
let geoRequest: Promise<string | null> | undefined;

/** The visitor's ISO country (host IP header, else browser time zone), resolved once and remembered for the session. */
function visitorCountry() {
  geoRequest ??= (async () => {
    try {
      const saved = sessionStorage.getItem(GEO_KEY);
      if (saved) return saved === "-" ? null : saved;
    } catch {}
    const ipCountry = await fetch("/api/geo", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ country?: string | null }>) : null))
      .then((d) => d?.country ?? null, () => null);
    const country = ipCountry ?? timezoneCountry();
    try { sessionStorage.setItem(GEO_KEY, country ?? "-"); } catch {}
    return country;
  })();
  return geoRequest;
}

function dialCodeFor(iso: string) {
  let name = dialCodeAliases[iso];
  if (!name) try { name = new Intl.DisplayNames(["en"], { type: "region" }).of(iso) ?? ""; } catch { return undefined; }
  return dialCodes.find((option) => option.value.startsWith(`${name} (`))?.value;
}

/** Dial-code choices from the live site, inside the Figma phone field. Defaults to the visitor's location (UAE otherwise). */
export function PhoneInput({ className = "", name = "phone", ...props }: ComponentProps<"input">) {
  const [country, setCountry] = useState(dialCodes[0].value);
  const touched = useRef(false);

  useEffect(() => {
    let active = true;
    visitorCountry().then((iso) => {
      const match = iso && dialCodeFor(iso);
      if (active && match && !touched.current) setCountry(match);
    });
    return () => { active = false; };
  }, []);
  const code = country.match(/\(([^)]+)\)/)?.[1] ?? "+971";
  return (
    <div className={`relative flex h-[3.25rem] w-full items-center gap-2.5 rounded-sm border-[0.5px] border-transparent bg-light-200 px-5 focus-within:border-grey-300 ${className}`}>
      <select
        aria-label="Phone country code"
        name={`${name}CountryCode`}
        value={country}
        onChange={(event) => { touched.current = true; setCountry(event.target.value); }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {dialCodes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <span aria-hidden="true" className="pointer-events-none flex shrink-0 items-center gap-2.5">
        {country === dialCodes[0].value && <img alt="" src="/icons/flag-uae.svg" width={22} height={22} className="size-[1.375rem]" />}
        <span className="t-body3 font-semibold text-dark-300">{code}</span>
        <span className="relative flex h-[0.9375rem] w-0 items-center justify-center" style={{ containerType: "size" }}>
          <span className="block w-[100cqh] flex-none rotate-90">
            <img alt="" src="/icons/divider-v.svg" className="block h-px w-full max-w-none" />
          </span>
        </span>
      </span>
      <input
        type="tel"
        inputMode="tel"
        aria-label={props["aria-label"] ?? props.placeholder ?? "Phone"}
        name={name}
        className="t-body3 relative h-full min-w-0 flex-1 bg-light-200 font-medium text-dark-300 outline-none placeholder:font-normal placeholder:text-grey-300"
        {...props}
      />
      <Chevron className="pointer-events-none" />
    </div>
  );
}

export function ConfidentialNote() {
  return (
    <p className="flex items-center justify-center gap-1">
      <span className="relative size-3 shrink-0 overflow-hidden">
        <img alt="" src="/icons/tick-small.svg" className="absolute top-[4.15%] left-[10.05%] block h-[91.66%] w-[80%] max-w-none" />
      </span>
      <span className="t-body4 text-center text-dark-200">Your information is confidential</span>
    </p>
  );
}
