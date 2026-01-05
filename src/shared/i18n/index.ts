import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enNav from "./locales/en/nav.json";
import deCommon from "./locales/de/common.json";
import deNav from "./locales/de/nav.json";

export function initI18n(initialLng: "en" | "de" = "en") {
  if (i18n.isInitialized) return i18n;

  i18n.use(initReactI18next).init({
    resources: {
      en: { common: enCommon, nav: enNav },
      de: { common: deCommon, nav: deNav },
    },
    lng: initialLng,
    fallbackLng: "en",
    ns: ["common", "nav"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
  });

  return i18n;
}
