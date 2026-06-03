"use client";

import type { AccountListItem } from "@/lib/account-groups";
import {
  institutionAvatarInitial,
  institutionAvatarLabel,
  plaidInstitutionLogoUrl,
} from "@/lib/account-display";
import { useState } from "react";

const INSTITUTION_COLORS = [
  "bg-sky-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
];

function getInstitutionColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i)) % 997;
  }
  return INSTITUTION_COLORS[hash % INSTITUTION_COLORS.length];
}

type InstitutionAvatarProps = {
  account: AccountListItem;
  className?: string;
};

export function InstitutionAvatar({ account, className = "" }: InstitutionAvatarProps) {
  const label = institutionAvatarLabel(account);
  const initial = institutionAvatarInitial(label);
  const logoUrl = plaidInstitutionLogoUrl(account.plaidInstitutionId);
  const colorSeed = account.plaidInstitutionId ?? label;
  const [logoFailed, setLogoFailed] = useState(false);

  const showLogo = logoUrl && !logoFailed;

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white ${showLogo ? "bg-white" : getInstitutionColor(colorSeed)} ${className}`}
      aria-hidden
    >
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element -- external Plaid CDN logo
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full object-contain p-1"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        initial
      )}
    </div>
  );
}
