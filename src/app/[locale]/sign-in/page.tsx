import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import SignInForm from '@/components/SignInForm';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('title') };
}

export default async function SignInPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // The callback bounces failures back here with a reason. Without surfacing
  // it, a dead link returned a pristine sign-in form and looked like the click
  // simply did nothing.
  const { error } = await searchParams;
  return <SignInForm problem={error} />;
}
