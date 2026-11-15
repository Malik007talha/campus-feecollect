import { useLanguage } from '../../context/LanguageContext';

export default function ComingSoon({ title }) {
  const { t } = useLanguage();
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
      <p className="mt-2 text-muted">{t('comingSoon')}</p>
    </div>
  );
}