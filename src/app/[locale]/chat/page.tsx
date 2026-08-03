import { redirect } from '@/i18n/navigation';

/** Chat moved to the home screen; keep old links working. */
export default async function ChatRedirect({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: '/', locale });
}
