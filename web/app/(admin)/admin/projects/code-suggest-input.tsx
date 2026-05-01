"use client";

import { useState } from "react";
import { suggestProjectCode } from "@/lib/document-numbering-format";

export function CodeSuggestInput({ nameInputId }: { nameInputId: string }) {
  const [touched, setTouched] = useState(false);
  const [value, setValue] = useState("");

  return (
    <input
      name="code"
      maxLength={3}
      pattern="[A-Za-z]{3}"
      title="Three letters (A–Z). Auto-suggested from project name."
      placeholder="e.g. MNR"
      value={value}
      onChange={(e) => {
        setTouched(true);
        setValue(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3));
      }}
      onFocus={(e) => {
        if (touched) return;
        const nameEl = document.getElementById(
          nameInputId,
        ) as HTMLInputElement | null;
        const suggestion = suggestProjectCode(nameEl?.value ?? "");
        if (suggestion) {
          setValue(suggestion);
          e.currentTarget.select();
        }
      }}
      className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm uppercase tracking-widest tabular-nums transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
    />
  );
}
