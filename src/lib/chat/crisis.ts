import type { SensitiveCategory } from './routes';

/**
 * Crisis resources.
 *
 * ⚠️ THIS LIST NEEDS HUMAN VERIFICATION BEFORE LAUNCH. Numbers change, services
 * close, and coverage varies by country. It must be checked by whoever signs
 * off the SENSITIVE route, and re-checked on a schedule.
 *
 * It is deliberately a static list rather than an API. A crisis response must
 * not depend on a third party being reachable, and it must be reviewable —
 * nobody can audit a number that arrives at runtime.
 */

export type Helpline = {
  name: string;
  contact: string;
  note?: { en: string; ar: string };
};

export type CrisisResources = {
  /** Shown above the list. */
  region: string;
  helplines: Helpline[];
};

const UK: CrisisResources = {
  region: 'GB',
  helplines: [
    {
      name: 'Samaritans',
      contact: '116 123',
      note: { en: 'Free, 24 hours, any day', ar: 'مجاني، على مدار الساعة' }
    },
    {
      name: 'Shout',
      contact: 'Text SHOUT to 85258',
      note: { en: 'Free, 24 hours, by text', ar: 'مجاني، على مدار الساعة، بالرسائل' }
    },
    {
      name: 'Muslim Youth Helpline',
      contact: '0808 808 2008',
      note: { en: 'Faith-sensitive, confidential', ar: 'سرّي ومراعٍ للخصوصية الدينية' }
    },
    {
      name: 'Emergency',
      contact: '999',
      note: { en: 'If you are in immediate danger', ar: 'إذا كنت في خطر مباشر' }
    }
  ]
};

const ABUSE_UK: CrisisResources = {
  region: 'GB',
  helplines: [
    {
      name: "National Domestic Abuse Helpline",
      contact: '0808 2000 247',
      note: { en: 'Free, 24 hours, confidential', ar: 'مجاني، على مدار الساعة، وسرّي' }
    },
    {
      name: 'Muslim Womens Network UK',
      contact: '0800 999 5786',
      note: { en: 'Faith and culture aware', ar: 'مراعٍ للدين والثقافة' }
    },
    {
      name: "Men's Advice Line",
      contact: '0808 8010 327',
      note: { en: 'For men experiencing abuse', ar: 'للرجال الذين يتعرضون للإساءة' }
    },
    {
      name: 'Emergency',
      contact: '999',
      note: { en: 'If you are in immediate danger', ar: 'إذا كنت في خطر مباشر' }
    }
  ]
};

/**
 * Fallback for everywhere the list does not yet cover. Naming a directory is
 * more honest than naming a number that may not answer in the user's country.
 */
const INTERNATIONAL: CrisisResources = {
  region: 'INT',
  helplines: [
    {
      name: 'Find a Helpline',
      contact: 'findahelpline.com',
      note: {
        en: 'Free, confidential support lines by country',
        ar: 'خطوط دعم مجانية وسرّية حسب البلد'
      }
    },
    {
      name: 'Befrienders Worldwide',
      contact: 'befrienders.org',
      note: { en: 'International directory', ar: 'دليل دولي' }
    }
  ]
};

/**
 * Resources for a crisis category, chosen by country.
 *
 * Only GB is populated. Anywhere else gets the international directory rather
 * than a plausible-looking wrong number — this is the one place where a
 * confident guess is worse than an honest handoff.
 */
export function crisisResources(
  category: SensitiveCategory,
  country?: string
): CrisisResources {
  const gb = country?.toUpperCase() === 'GB';
  if (!gb) return INTERNATIONAL;
  return category === 'abuse' ? ABUSE_UK : UK;
}
