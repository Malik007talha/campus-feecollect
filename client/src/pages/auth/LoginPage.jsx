import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, GraduationCap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getErrorMessage } from '../../services/api';

const schema = z.object({
  identifier: z.string().trim().min(1, 'Please enter your email or username'),
  password: z.string().min(1, 'Please enter your password'),
});

export default function LoginPage() {
  const { user, login } = useAuth();
  const { t, toggleLang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async ({ identifier, password }) => {
    setServerError('');
    try {
      await login(identifier, password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  const inputClass =
    'mt-1 block w-full rounded-md border border-line bg-white px-3 py-3 text-base text-ink placeholder:text-muted/70 focus:border-primary-600 focus:outline-none';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <button
        type="button"
        onClick={toggleLang}
        className="absolute end-4 top-4 rounded-md px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
      >
        {t('language')}
      </button>

      <div className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-navy-900 text-white">
            <GraduationCap className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-bold text-navy-900">{t('appName')}</h1>
        </div>

        <h2 className="mt-6 text-2xl font-semibold text-ink">{t('welcomeBack')}</h2>
        <p className="mt-1 text-muted">{t('loginHelp')}</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
          {serverError && (
            <div role="alert" className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
              {serverError}
            </div>
          )}

          <div>
            <label htmlFor="identifier" className="block text-sm font-medium">
              {t('identifier')} <span className="text-danger-600">*</span>
            </label>
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              placeholder="e.g. accountant"
              className={inputClass}
              {...register('identifier')}
            />
            {errors.identifier && <p className="mt-1 text-sm text-danger-600">{errors.identifier.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              {t('password')} <span className="text-danger-600">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={`${inputClass} pe-12`}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                className="absolute end-1 top-1 flex h-11 w-11 items-center justify-center rounded-md text-muted hover:text-ink"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-sm text-danger-600">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary-700 px-4 py-3 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
            {t('login')}
          </button>
        </form>
      </div>
    </main>
  );
}