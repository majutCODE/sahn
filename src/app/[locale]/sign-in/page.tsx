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
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SignInForm />;
}
