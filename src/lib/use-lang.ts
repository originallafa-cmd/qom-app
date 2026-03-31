"use client";

import { useState, useEffect } from "react";
import type { Locale } from "@/lib/i18n";

export function useLang(): [Locale, (l: Locale) => void] {
  const [lang, setLangState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("qom_lang") as Locale | null;
    if (saved === "en" || saved === "fil") setLangState(saved);
  }, []);

  function setLang(l: Locale) {
    setLangState(l);
    localStorage.setItem("qom_lang", l);
  }

  return [lang, setLang];
}
