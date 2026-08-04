import type { SensitiveCategory } from './routes';

/**
 * Crisis resources.
 *
 * ⚠️ RE-VERIFY BEFORE EACH RELEASE. Numbers change and services close. Every
 * entry carries the operator it was taken from; anything that could not be
 * traced to an official operator was left out rather than guessed, which is
 * why several countries fall through to the directory.
 *
 * Static by design. A crisis response must not depend on a third party being
 * reachable, and it must be reviewable — nobody can audit a number that
 * arrives at runtime.
 *
 * The rule for adding a country: name the operator, not an aggregator, and
 * describe the service as it actually is. Saudi Arabia's 937 is listed as a
 * Ministry of Health line because that is what its own page says it is;
 * presenting it as a crisis line would be a small lie in the worst possible
 * place.
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

const EMERGENCY = (number: string): Helpline => ({
  name: 'Emergency',
  contact: number,
  note: { en: 'If you are in immediate danger', ar: 'إذا كنت في خطر مباشر' }
});

const DIRECTORY: Helpline = {
  name: 'Find a Helpline',
  contact: 'findahelpline.com',
  note: {
    en: 'Free, confidential support lines by country',
    ar: 'خطوط دعم مجانية وسرّية حسب البلد'
  }
};

const ALWAYS = { en: 'Free, 24 hours, any day', ar: 'مجاني، على مدار الساعة' };
const BY_TEXT = {
  en: 'Free, 24 hours, by text',
  ar: 'مجاني، على مدار الساعة، بالرسائل'
};
const CONFIDENTIAL = { en: 'Free and confidential', ar: 'مجاني وسرّي' };

/** Country → resources by category. The operator is named in the comment. */
const BY_COUNTRY: Record<string, { self_harm: Helpline[]; abuse: Helpline[] }> = {
  // samaritans.org · giveusashout.org · myh.org.uk · nationaldahelpline.org.uk
  GB: {
    self_harm: [
      { name: 'Samaritans', contact: '116 123', note: ALWAYS },
      { name: 'Shout', contact: 'Text SHOUT to 85258', note: BY_TEXT },
      {
        name: 'Muslim Youth Helpline',
        contact: '0808 808 2008',
        note: {
          en: 'Faith-sensitive, confidential',
          ar: 'سرّي ومراعٍ للخصوصية الدينية'
        }
      },
      EMERGENCY('999')
    ],
    abuse: [
      {
        name: 'National Domestic Abuse Helpline',
        contact: '0808 2000 247',
        note: ALWAYS
      },
      {
        name: 'Muslim Women’s Network UK',
        contact: '0800 999 5786',
        note: { en: 'Faith and culture aware', ar: 'مراعٍ للدين والثقافة' }
      },
      {
        name: 'Men’s Advice Line',
        contact: '0808 8010 327',
        note: {
          en: 'For men experiencing abuse',
          ar: 'للرجال الذين يتعرضون للإساءة'
        }
      },
      EMERGENCY('999')
    ]
  },

  // u.ae · doh.gov.ae (800 SAKINA) · dfwac.ae (800 111)
  AE: {
    self_harm: [
      {
        name: '800 HOPE',
        contact: '800 4673',
        note: {
          en: 'National mental health support line',
          ar: 'خط الدعم النفسي الوطني'
        }
      },
      {
        name: '800 SAKINA (Abu Dhabi)',
        contact: '800 725462',
        note: {
          en: '24 hours, Arabic and English',
          ar: 'على مدار الساعة، بالعربية والإنجليزية'
        }
      },
      EMERGENCY('999')
    ],
    abuse: [
      {
        name: 'Dubai Foundation for Women and Children',
        contact: '800 111',
        note: ALWAYS
      },
      { name: 'Aman (Abu Dhabi)', contact: '800 7283', note: CONFIDENTIAL },
      {
        name: 'Child Protection',
        contact: '116 111',
        note: { en: 'For concerns about a child', ar: 'للبلاغ عن طفل في خطر' }
      },
      EMERGENCY('999')
    ]
  },

  // moh.gov.sa. Its own page describes 937 as a 24/7 medical consultation
  // line, not a mental health service — a real route to help, listed as what
  // it is, with the directory beside it for a specialist line.
  SA: {
    self_harm: [
      {
        name: 'Ministry of Health (937)',
        contact: '937',
        note: {
          en: '24 hours, medical consultation and referral',
          ar: 'على مدار الساعة، استشارة طبية وإحالة'
        }
      },
      DIRECTORY,
      EMERGENCY('997')
    ],
    abuse: [DIRECTORY, EMERGENCY('997')]
  },

  // hamad.qa · moph.gov.qa — National Mental Health Helpline, operated by
  // Hamad Medical Corporation.
  QA: {
    self_harm: [
      {
        name: 'National Mental Health Helpline',
        contact: '16000, then option 4',
        note: { en: '24 hours, multilingual', ar: 'على مدار الساعة، بعدّة لغات' }
      },
      EMERGENCY('999')
    ],
    abuse: [DIRECTORY, EMERGENCY('999')]
  },

  // 988lifeline.org · thehotline.org
  US: {
    self_harm: [
      {
        name: '988 Suicide & Crisis Lifeline',
        contact: '988',
        note: {
          en: 'Call or text, 24 hours',
          ar: 'اتصال أو رسالة، على مدار الساعة'
        }
      },
      EMERGENCY('911')
    ],
    abuse: [
      {
        name: 'National Domestic Violence Hotline',
        contact: '1-800-799-7233, or text START to 88788',
        note: ALWAYS
      },
      EMERGENCY('911')
    ]
  },

  // 988.ca
  CA: {
    self_harm: [
      {
        name: '988 Suicide Crisis Helpline',
        contact: '988',
        note: {
          en: 'Call or text, 24 hours, English and French',
          ar: 'اتصال أو رسالة، على مدار الساعة، بالإنجليزية والفرنسية'
        }
      },
      EMERGENCY('911')
    ],
    abuse: [DIRECTORY, EMERGENCY('911')]
  },

  // lifeline.org.au · 1800respect.org.au
  AU: {
    self_harm: [
      { name: 'Lifeline', contact: '13 11 14', note: ALWAYS },
      EMERGENCY('000')
    ],
    abuse: [
      { name: '1800RESPECT', contact: '1800 737 732', note: ALWAYS },
      EMERGENCY('000')
    ]
  },

  // samaritans.org/ireland · textaboutit.ie · womensaid.ie
  IE: {
    self_harm: [
      { name: 'Samaritans', contact: '116 123', note: ALWAYS },
      { name: 'Text About It', contact: 'Text HELLO to 50808', note: BY_TEXT },
      EMERGENCY('112')
    ],
    abuse: [
      { name: 'Women’s Aid', contact: '1800 341 900', note: ALWAYS },
      EMERGENCY('112')
    ]
  }
};

/**
 * Fallback for everywhere not covered above — still most of the world,
 * including Kuwait, Bahrain and Oman, where nothing could be traced to an
 * official operator. Naming a directory is more honest than naming a number
 * that may not answer.
 */
const INTERNATIONAL: CrisisResources = {
  region: 'INT',
  helplines: [
    DIRECTORY,
    {
      name: 'Befrienders Worldwide',
      contact: 'befrienders.org',
      note: { en: 'International directory', ar: 'دليل دولي' }
    }
  ]
};

export const COVERED_COUNTRIES = Object.keys(BY_COUNTRY);

/**
 * Resources for a crisis category, chosen by country.
 *
 * An unknown country gets the directory rather than a plausible-looking wrong
 * number. This is the one place in the product where a confident guess is
 * worse than an honest handoff.
 */
export function crisisResources(
  category: SensitiveCategory,
  country?: string
): CrisisResources {
  const code = country?.toUpperCase();
  const entry = code ? BY_COUNTRY[code] : undefined;
  if (!entry || !code) return INTERNATIONAL;

  return {
    region: code,
    helplines: category === 'abuse' ? entry.abuse : entry.self_harm
  };
}
