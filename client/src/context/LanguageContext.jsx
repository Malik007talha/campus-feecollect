import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { translations } from '../constants/translations';

const LanguageContext = createContext(null);
const LANG_KEY = 'fc_lang';

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || 'en');

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  const t = useCallback((key) => translations[lang][key] ?? translations.en[key] ?? key, [lang]);
  const toggleLang = () => setLang((l) => (l === 'en' ? 'ur' : 'en'));

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLang }}>{children}</LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => useContext(LanguageContext);