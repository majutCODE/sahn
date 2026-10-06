/**
 * How Sahn answers.
 *
 * Every figure here is real and should be checked against the database when it
 * changes, not estimated. This is the page a sceptical reader opens before
 * trusting the product with a religious question, and a page of claims that
 * turns out to be approximate is worse than no page.
 *
 * Counts verified against production on 2026-10-06.
 */

export type Bilingual = { en: string; ar: string };

export const CORPUS = {
  ayat: 6236,
  hadith: 36057,
  collections: 9,
  duas: 20
} as const;

export type AboutSection = { heading: Bilingual; body: Bilingual };

export const ABOUT: AboutSection[] = [
  {
    heading: { en: 'What Sahn is', ar: 'ما هو سَحْن' },
    body: {
      en: 'An assistant you can ask anything. Most questions have nothing to do with religion, and those are answered as any capable assistant would answer them, without religious framing bolted on.\n\nWhere a question touches Islam, the behaviour changes, and the rest of this page is about how.',
      ar: 'مساعد تسأله عن أي شيء. وأكثر الأسئلة لا صلة لها بالدين، وتلك تُجاب كما يجيبها أي مساعد قدير، من غير إقحام إطار ديني عليها.\n\nفإذا مسّ السؤال الإسلام تغيّر السلوك، وبقية هذه الصفحة في بيان ذلك.'
    }
  },
  {
    heading: { en: 'Questions of Islamic law are not generated', ar: 'مسائل الفقه لا تُنشأ إنشاءً' },
    body: {
      en: 'This is the whole design. When a question is one of Islamic law, Sahn does not compose a ruling from what a language model happens to have absorbed. It searches its sources, puts the passages it found in front of the model, and requires the answer to come from those passages with every claim cited to a reference you can open and read.\n\nWhere the sources do not answer, it says so and stops. An answer that says "the retrieved material does not settle this" is the system working, not failing.',
      ar: 'وهذا أصل التصميم. فإذا كان السؤال مسألة فقهية لم يُنشئ سَحْن حكمًا مما وقع لنموذج لغوي، بل يبحث في مصادره، ويضع ما وجده بين يدي النموذج، ويُلزمه أن يكون الجواب منها، مع إحالة كل دعوى إلى مرجع تفتحه وتقرؤه.\n\nوإذا لم تُجب المصادر صرّح بذلك ووقف. والجواب بأن المادة المسترجعة لا تحسم المسألة هو عمل النظام على وجهه، لا إخفاقه.'
    }
  },
  {
    heading: { en: 'What it searches', ar: 'ما الذي يبحث فيه' },
    body: {
      en: 'The Qur\'an in full, {ayat} verses, with translations served under licence from Quran.com. {hadith} narrations across {collections} collections, including all six of the canonical books, from a public-domain dataset. A small library of supplications with their sources named.\n\nSearch is by meaning rather than by keyword: the question and every passage are turned into numerical form, and the closest passages are retrieved. That is why asking about "feeling hopeless" can surface a verse that never uses the word.',
      ar: 'القرآن كاملًا، وهو {ayat} آية، مع ترجمات مقدَّمة بترخيص من «قرآن دوت كوم». و{hadith} حديثًا في {collections} مجموعات، منها الكتب الستة كلها، من بيانات في الملك العام. ومكتبة صغيرة من الأدعية مع تسمية مصادرها.\n\nوالبحث بالمعنى لا باللفظ: يُحوَّل السؤال وكل نصّ إلى صورة عددية، ثم تُسترجع أقرب النصوص. ولهذا قد يَرِد بالسؤال عن اليأس آيةٌ لا يَرِد فيها لفظه.'
    }
  },
  {
    heading: { en: 'What it will not do', ar: 'ما لا يفعله' },
    body: {
      en: 'It does not issue fatwa. A ruling for your circumstances comes from a qualified scholar who knows them; nothing here substitutes for that, and no answer from Sahn should be quoted as though it were one.\n\nIt does not rank the schools. Where they differ, the difference is named and attributed rather than resolved in favour of one.\n\nIt does not give financial, legal or medical advice. The finance guide explains structures and reports disagreements; the zakat calculator applies published rules to figures you enter.\n\nWhere a message discloses distress, harm or abuse, it does not reach a language model at all. The response is written in advance, reviewed, and returned with support services for the reader\'s country. That path cannot be bypassed by rephrasing.',
      ar: 'لا يُفتي. فالحكم في نازلتك يصدر عن عالم مؤهَّل يعرف حالك، ولا يقوم شيء هنا مقامه، ولا يُنقل جواب منه على أنه فتوى.\n\nولا يرجّح بين المذاهب. فحيث اختلفت يُسمّى الخلاف ويُنسب، ولا يُحسم لأحدها.\n\nولا يُفتي في مال ولا قانون ولا طبّ. فدليل التمويل يشرح البنى ويذكر الخلاف، وحاسبة الزكاة تطبّق قواعد منشورة على أرقام تُدخلها.\n\nوإذا أفصحت رسالة عن كرب أو أذًى أو إساءة لم تبلغ نموذجًا لغويًا أصلًا. فالجواب مكتوب سلفًا ومراجَع، ويُرفق بجهات الدعم في بلد القارئ. وهذا المسار لا يُتجاوز بإعادة الصياغة.'
    }
  },
  {
    heading: { en: 'Computed, not fetched', ar: 'محسوب لا مجلوب' },
    body: {
      en: 'Prayer times, the Qibla direction and Hijri dates are calculated on your device from published astronomical models and your location. No request leaves the device to produce them, which is why they work on a plane.\n\nThey are close, not authoritative. Calculation methods differ, and where your local mosque or moon-sighting authority disagrees with the figure shown, theirs governs.',
      ar: 'أوقات الصلاة واتجاه القبلة والتواريخ الهجرية تُحسب على جهازك من نماذج فلكية منشورة ومن موقعك. ولا يخرج من الجهاز طلب لإنتاجها، ولهذا تعمل في الطائرة.\n\nوهي قريبة لا حجّة. فطرق الحساب مختلفة، وحيث خالف مسجدك أو جهة الرؤية ما يُعرض لك فالعبرة بقولهم.'
    }
  },
  {
    heading: { en: 'Who built it, and what it is not', ar: 'من بناه وما ليس هو' },
    body: {
      en: 'Sahn is an independent project, not the output of a mosque, a madhhab or an institution, and it does not speak for any of them. It is not a scholarly authority and does not present itself as one.\n\nIt is a tool for finding what the sources say and reading them yourself. If it ever makes that harder rather than easier, it has failed at the only thing it was built to do.',
      ar: 'سَحْن مشروع مستقل، لا يصدر عن مسجد ولا مذهب ولا مؤسسة، ولا ينطق باسم أحد منها. وليس مرجعًا علميًا ولا يقدّم نفسه كذلك.\n\nوإنما هو أداة للوقوف على ما تقوله المصادر وقراءتها بنفسك. فإن صار يصعّب ذلك بدل أن ييسّره فقد أخفق في الشيء الوحيد الذي بُني له.'
    }
  }
];
