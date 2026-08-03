import { setRequestLocale } from 'next-intl/server';
import ChatRoom from '@/components/ChatRoom';

/** A saved conversation, opened from the sidebar. */
export default async function ThreadPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <ChatRoom threadId={id} />;
}
