/**
 * The three chat routes, and the deterministic floor beneath the classifier.
 *
 * The build spec is explicit: the SENSITIVE route "can never be disabled,
 * prompt-engineered around, or bypassed by a user instruction". A model-based
 * classifier alone cannot honour that — a classifier is itself a prompt, and
 * anything that reads user text can be talked out of its job.
 *
 * So classification has two layers, and they only ever move in one direction:
 *
 *   1. This file: pattern matching over the message. Cannot be argued with.
 *   2. The model classifier: may ESCALATE to sensitive, never de-escalate.
 *
 * A false positive here costs a user one unnecessary "please speak to someone".
 * A false negative costs considerably more. The asymmetry decides the tuning.
 */

export const ROUTES = ['fiqh', 'general', 'sensitive'] as const;
export type Route = (typeof ROUTES)[number];

export const SENSITIVE_CATEGORIES = [
  'self_harm',
  'abuse',
  'divorce',
  'inheritance',
  'custody',
  'apostasy',
  'takfir',
  'medical',
  'legal',
  'deviance'
] as const;
export type SensitiveCategory = (typeof SENSITIVE_CATEGORIES)[number];

/**
 * Categories that bypass everything, in every module, and return support plus
 * crisis resources — including inside Counsel mode, where the conversation is
 * otherwise left alone.
 */
export const CRISIS_CATEGORIES: readonly SensitiveCategory[] = [
  'self_harm',
  'abuse'
];

export function isCrisis(category: SensitiveCategory | null): boolean {
  return category !== null && CRISIS_CATEGORIES.includes(category);
}

/**
 * Patterns are matched against a normalised copy of the message: lowercased,
 * Arabic diacritics stripped, alif/ya/ta-marbuta forms folded, and runs of
 * punctuation or spacing collapsed. That last part matters — "s u i c i d e"
 * and "s.u.i.c.i.d.e" are the oldest filter evasions there are.
 */
const PATTERNS: Array<{ category: SensitiveCategory; patterns: RegExp[] }> = [
  {
    category: 'self_harm',
    patterns: [
      /\bsuicid/,
      /\bkill(ing)?\s*(my)?self\b/,
      /\bend(ing)?\s*(my|it)\s*(own\s*)?(life|all)\b/,
      /\btake\s*my\s*own\s*life\b/,
      /\bwant\s*to\s*die\b/,
      /\bwish\s*i\s*(was|were)\s*dead\b/,
      /\bbetter\s*off\s*dead\b/,
      /\bself[\s-]*harm/,
      /\bhurt(ing)?\s*myself\b/,
      /\bcut(ting)?\s*myself\b/,
      /\bno\s*reason\s*to\s*(live|go\s*on)\b/,
      /\bdont\s*want\s*to\s*(live|be\s*here)\b/,
      /انتحار|انتحر|اقتل نفسي|اؤذي نفسي|اريد ان اموت|لا اريد ان اعيش/
    ]
  },
  {
    category: 'abuse',
    patterns: [
      /\b(he|she|they|husband|wife|father|mother|parents?|brother|uncle)\s*(always\s*|keeps?\s*)?(hits?|hitting|beats?|beating|strangl|chokes?|punch)/,
      /\b(hits?|beats?|abuses?)\s*me\b/,
      /\bdomestic\s*(violence|abuse)\b/,
      /\bbeing\s*abused\b/,
      /\b(sexual|physical|emotional)ly?\s*abus/,
      /\bforced\s*me\s*to\b/,
      /يضربني|يعتدي علي|العنف الاسري|يسيء معاملتي|اساءة/
    ]
  },
  {
    category: 'divorce',
    patterns: [/\btalaq\b/, /\bdivorc/, /\bkhula\b/, /\biddah\b/, /طلاق|خلع|عده/]
  },
  {
    category: 'inheritance',
    patterns: [
      /\binheritanc/,
      /\binherit(s|ed|ing)?\b/,
      /\bfaraid\b/,
      /\bmirath\b/,
      /\bestate\s*(is|of|should)\b/,
      /ميراث|مواريث|الفرائض|تركه/
    ]
  },
  {
    category: 'custody',
    patterns: [/\bcustody\b/, /\bhadanah\b/, /حضانه|الحضانه/]
  },
  {
    category: 'apostasy',
    patterns: [
      /\bapostas/,
      /\bapostate\b/,
      /\bmurtad\b/,
      /\bleav(e|ing)\s*islam\b/,
      /\brenounc\w*\s*(islam|my\s*faith)\b/,
      /رده|مرتد|ترك الاسلام/
    ]
  },
  {
    category: 'takfir',
    patterns: [
      /\btakfir\b/,
      /\bis\s+\w[\w\s'-]{0,40}\s+a\s+(kafir|kaafir|disbeliever|munafiq)\b/,
      /\bare\s+\w[\w\s'-]{0,40}\s+(kafir|kuffar|disbelievers)\b/,
      /\bdeclare\s*\w*\s*(kafir|apostate)\b/,
      /تكفير|هل هو كافر|هل هم كفار/
    ]
  },
  {
    category: 'medical',
    patterns: [
      /\bmedication\b/,
      /\bmedicine\s*(for|that|my)\b/,
      /\b(should|can)\s*i\s*(stop|start|take)\s*(taking\s*)?(my\s*)?(the\s*)?(pill|meds|medication|insulin|antidepress)/,
      /\bprescri(bed|ption)\b/,
      /\bdosage\b/,
      /\bmy\s*(doctor|diagnosis|treatment|surgery|chemo)\b/,
      /\bam\s*i\s*(depressed|bipolar|autistic)\b/,
      /دواء|علاج طبي|وصفه طبيه|جرعه/
    ]
  },
  {
    category: 'legal',
    patterns: [
      /\blawsuit\b/,
      /\bsue\s*(him|her|them|my)\b/,
      /\bcourt\s*(case|hearing|order|date)\b/,
      /\bmy\s*lawyer\b/,
      /\blegal\s*(proceeding|action|advice)\b/,
      /\bpolice\s*(report|charge)/,
      /محكمه|قضيه قانونيه|محامي|دعوى/
    ]
  },
  {
    category: 'deviance',
    patterns: [
      /\bare\s*(the\s*)?\w[\w\s'-]{0,40}\s*(deviant|misguided|a\s*cult|out\s*of\s*islam)\b/,
      /\bis\s*\w[\w\s'-]{0,40}\s*(a\s*)?(deviant|heretic|innovator)\b/,
      /\bmisguided\s*sect\b/,
      /\bahl al bidah\b/,
      /منحرف|فرقه ضاله|اهل البدع/
    ]
  }
];

/** Lowercase, strip diacritics, fold letter variants, defeat spacing tricks. */
export function normalise(message: string): string {
  return (
    message
      .toLowerCase()
      .normalize('NFKD')
      // Every combining mark: Arabic harakat and the hamza that NFKD splits off
      // أ into, plus Latin accents. A narrow range here silently leaves the
      // hamza behind, which then becomes a space and breaks the Arabic patterns.
      .replace(/\p{M}/gu, '')
      .replace(/ـ/g, '')
      .replace(/[ىی]/g, 'ي')
      .replace(/ة/g, 'ه')
      // Apostrophes are deleted rather than spaced, so "don't" reads as "dont"
      // and "fara'id" as "faraid" — both are how the patterns are written.
      .replace(/['’ʼ`]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      // Letter-by-letter spacing: "s u i c i d e", "k-i-l-l m-y-s-e-l-f".
      // Requires a run of at least three single letters, so ordinary text like
      // "neighbour a kafir" is untouched — an earlier version joined on any
      // single letter and quietly corrupted every sentence with "a" or "I".
      .replace(/(?:\b\p{L} ){2,}\p{L}\b/gu, (run) => run.replace(/ /g, ''))
      .trim()
  );
}

export type PreFilterResult = {
  route: Route;
  category: SensitiveCategory | null;
  crisis: boolean;
};

/**
 * The deterministic floor. Returns `sensitive` when any pattern matches.
 *
 * Crisis categories are checked first so that a message containing both a
 * disclosure and a fiqh question is handled as the disclosure — the person
 * matters more than the ruling.
 */
export function preFilter(message: string): PreFilterResult {
  const text = normalise(message);

  for (const category of CRISIS_CATEGORIES) {
    const entry = PATTERNS.find((p) => p.category === category);
    if (entry?.patterns.some((re) => re.test(text))) {
      return { route: 'sensitive', category, crisis: true };
    }
  }

  for (const { category, patterns } of PATTERNS) {
    if (patterns.some((re) => re.test(text))) {
      return { route: 'sensitive', category, crisis: false };
    }
  }

  return { route: 'general', category: null, crisis: false };
}

/**
 * Combines the floor with the model's opinion. The model may escalate to
 * sensitive; it can never pull a message back down. This is the whole
 * guarantee — everything else is presentation.
 */
export function resolveRoute(
  floor: PreFilterResult,
  modelRoute: Route,
  modelCategory: SensitiveCategory | null
): PreFilterResult {
  if (floor.route === 'sensitive') return floor;

  if (modelRoute === 'sensitive') {
    return {
      route: 'sensitive',
      category: modelCategory,
      crisis: isCrisis(modelCategory)
    };
  }

  return { route: modelRoute, category: null, crisis: false };
}
