import { setRequestLocale } from 'next-intl/server';
import ChatRoom from '@/components/ChatRoom';

/**
 * The home screen is the chat. The modules are features in the sidebar, not
 * the front door — the assistant is the product.
 */
export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ChatRoom />;
}
