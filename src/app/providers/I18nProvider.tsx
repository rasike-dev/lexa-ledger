import React, { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { initI18n } from "../../shared/i18n";
import { useUIStore } from "../store/uiStore";

const i18nInstance = initI18n("en");

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const language = useUIStore((s) => s.language);

  useEffect(() => {
    i18nInstance.changeLanguage(language);
  }, [language]);

  return <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>;
}
