/**
 * Privacy notice and terms of use.
 *
 * ⚠️ Written from what the code actually does, not from a template — every
 * processor named below receives data because some line in this repository
 * sends it there. That accuracy is the part worth keeping; the drafting is
 * not legal advice, and a solicitor should review both documents before Sahn
 * takes money or markets itself.
 *
 * If a processor is added or removed, this file changes in the same commit.
 * A privacy notice that describes last month's architecture is worse than
 * none, because it is a statement of fact that has quietly become false.
 */

export type Bilingual = { en: string; ar: string };

export type LegalSection = {
  heading: Bilingual;
  /** Paragraphs; blank-line separated on render. */
  body: Bilingual;
};

export type LegalDocument = {
  slug: 'privacy' | 'terms';
  title: Bilingual;
  /** ISO date, rendered in the reader's calendar. */
  updated: string;
  intro: Bilingual;
  sections: LegalSection[];
};

/** Where a person writes to about any of this. */
export const CONTACT_EMAIL = 'privacy@sahn-ai.com';

export const PRIVACY: LegalDocument = {
  slug: 'privacy',
  title: { en: 'Privacy', ar: 'الخصوصية' },
  updated: '2026-08-04',
  intro: {
    en: 'Sahn holds worship records, and those are among the most private things a person keeps. This notice says exactly what is stored, who else sees it, and how to remove it. It describes what the software does today.',
    ar: 'يحفظ سَحْن سجلّات عبادة، وهي من أخصّ ما يحتفظ به المرء. وهذا البيان يوضّح ما يُخزَّن، ومن يطّلع عليه، وكيف يُحذف. وهو وصف لما يفعله البرنامج اليوم.'
  },
  sections: [
    {
      heading: { en: 'What is stored', ar: 'ما الذي يُخزَّن' },
      body: {
        en: 'Your email address, because sign-in is by emailed link and there is no password to hold instead.\n\nYour saved conversations — the questions you ask and the answers returned — unless the conversation was in incognito, which is described below.\n\nWhatever you record in the modules: prayers marked as prayed, missed prayers in the qada ledger, Qur\'an bookmarks and reading position, fasts, and zakat calculations you choose to save.\n\nYour settings: locale, city or coordinates for prayer times, calculation method, and madhhab.\n\nPage views are counted, so that it is possible to know whether anything here is being used. That counting sets no cookie, assigns you no identifier, and follows you nowhere else; it records that a page was requested, not who requested it, and it can see nothing about your account or your worship records.\n\nBeyond that: no advertising identifiers, no tracking pixels, no profile built for marketing, and nothing sold. The only cookies set are the ones that keep you signed in.',
        ar: 'بريدك الإلكتروني، لأن الدخول برابط يُرسل إليه، وليس ثمّة كلمة مرور تُحفظ بدلًا عنه.\n\nمحادثاتك المحفوظة — أسئلتك والأجوبة عنها — إلا أن تكون المحادثة في وضع التصفح الخفي، وسيأتي بيانه.\n\nما تسجّله في الوحدات: الصلوات المؤدّاة، والفوائت في سجل القضاء، وعلامات القرآن وموضع القراءة، والصيام، وحسابات الزكاة التي تختار حفظها.\n\nإعداداتك: اللغة، والمدينة أو الإحداثيات لأوقات الصلاة، وطريقة الحساب، والمذهب.\n\nوتُحصى مرّات فتح الصفحات، ليُعرف هل يُستعمل هذا الموقع أصلًا. وهذا الإحصاء لا يضع ملف ارتباط، ولا يُسنِد إليك معرّفًا، ولا يتبعك إلى غيره؛ إنما يسجّل أن صفحةً طُلبت لا من طلبها، ولا يرى شيئًا من حسابك ولا من سجلّات عبادتك.\n\nوما عدا ذلك: لا معرّفات إعلانية، ولا بكسل تتبّع، ولا ملفّ تعريفي يُبنى لأغراض تسويقية، ولا بيع لشيء. وليست ملفات الارتباط الموضوعة إلا ما يُبقيك مسجَّل الدخول.'
      }
    },
    {
      heading: { en: 'Who else sees it', ar: 'من يطّلع عليها' },
      body: {
        en: 'Sahn cannot answer without sending your message somewhere. Naming those places is the point of this section.\n\nAnthropic receives the text of a message you send to the assistant, in order to classify it and to write the answer. Voyage AI receives the text of messages with an Islamic dimension, and of verse searches, in order to convert them into the numerical form retrieval needs. Supabase stores the database and runs authentication. Vercel hosts the site, processes the requests, and counts page views as described above. Resend delivers the sign-in email. Quran.com supplies verse text and translations, and a market data provider supplies gold and silver prices for zakat.\n\nThey are given what they need to perform that function and nothing further. Your data is not sold, and it is not shared with anyone for advertising.',
        ar: 'لا يستطيع سَحْن الجواب دون إرسال رسالتك إلى جهة ما، وبيان تلك الجهات هو مقصود هذا الفصل.\n\nتتلقّى «أنثروبيك» نصّ الرسالة التي ترسلها إلى المساعد، لتصنيفها وكتابة الجواب. وتتلقّى «فويج» نصّ الرسائل ذات البُعد الإسلامي ونصّ عمليات البحث في الآيات، لتحويلها إلى الصورة العددية التي يحتاجها الاسترجاع. و«سوبابيس» تحتضن قاعدة البيانات وتتولّى المصادقة. و«فيرسل» تستضيف الموقع وتعالج الطلبات وتُحصي مرّات فتح الصفحات على الوجه المتقدّم. و«ريسند» توصل بريد تسجيل الدخول. و«قرآن دوت كوم» تزوّدنا بنصّ الآيات وترجماتها، ومزوّد بيانات سوقية يزوّدنا بأسعار الذهب والفضة للزكاة.\n\nويُعطى كلٌّ منها ما يلزم لأداء وظيفته لا غير. ولا تُباع بياناتك، ولا تُشارَك مع أحد لأغراض إعلانية.'
      }
    },
    {
      heading: { en: 'Incognito', ar: 'التصفح الخفي' },
      body: {
        en: 'A conversation marked incognito creates no thread and stores no messages. It is not a display setting: the server discards the thread reference rather than trusting the browser not to send one, so there is nothing for a later change of mind to expose.\n\nThe message is still sent to Anthropic to be answered — it has to be — but nothing about it is written to the database, and it will not appear in your history on any device.',
        ar: 'المحادثة في الوضع الخفي لا تُنشئ محادثة محفوظة ولا تُخزَّن رسائلها. وليس هذا إعدادًا في الواجهة: فالخادم يُسقط مرجع المحادثة ولا يعتمد على المتصفح في ألّا يرسله، فلا يبقى شيء يكشفه تبدّل رأي لاحق.\n\nوتُرسل الرسالة مع ذلك إلى «أنثروبيك» ليُجاب عنها — ولا بدّ من ذلك — لكن لا يُكتب منها شيء في قاعدة البيانات، ولا تظهر في سجلّك على أي جهاز.'
      }
    },
    {
      heading: { en: 'Who can read your records', ar: 'من يستطيع قراءة سجلّاتك' },
      body: {
        en: 'Every table holding personal data is protected at the database level by row-level security, and the policies deny by default: a query for a row that is not yours returns nothing, regardless of what the application asks for. This is enforced by the database rather than by the code, so a mistake in the application cannot open it.\n\nThe Qur\'an text, the hadith collection and the du\'a library are public reference material and are readable by anyone. Your worship records, settings and conversations are not.',
        ar: 'كل جدول يحوي بيانات شخصية محميّ في قاعدة البيانات بأمن مستوى الصفّ، وسياساته مانعة بالأصل: فالاستعلام عن صفٍّ ليس لك لا يُرجع شيئًا مهما طلب التطبيق. والذي يُنفّذ ذلك قاعدةُ البيانات لا الشِّفرة، فلا يفتحه خطأ في التطبيق.\n\nأما نصّ القرآن ومجموعة الحديث ومكتبة الأدعية فمادة مرجعية عامة يقرؤها كل أحد. وأما سجلّات عبادتك وإعداداتك ومحادثاتك فلا.'
      }
    },
    {
      heading: { en: 'How long it is kept', ar: 'مدة الحفظ' },
      body: {
        en: 'Until you remove it. Individual conversations can be deleted from the sidebar. Deleting your account removes everything at once: the account itself and every record attached to it, by cascade in the database rather than by a script that might miss a table.\n\nDeletion is immediate and cannot be undone. Export first if you want a copy — the account page produces a complete JSON file of everything held about you.',
        ar: 'إلى أن تحذفها. فيمكن حذف كل محادثة من الشريط الجانبي. وحذف الحساب يزيل كل شيء دفعةً واحدة: الحسابَ وكلَّ سجلّ متعلّق به، بالحذف المتتالي في قاعدة البيانات لا ببرنامج قد يُغفل جدولًا.\n\nوالحذف فوري لا رجعة فيه. فإن أردت نسخة فصدّرها أولًا — وصفحة الحساب تُخرج ملفًا كاملًا بصيغة JSON لكل ما هو محفوظ عنك.'
      }
    },
    {
      heading: { en: 'Your rights', ar: 'حقوقك' },
      body: {
        en: 'Under UK and EU data protection law you may ask for a copy of your data, ask for it to be corrected, ask for it to be erased, and object to how it is handled. The first and third are built into the account page so you do not have to ask anyone.\n\nFor anything else, or to complain, write to {email}. If you are in the UK and are not satisfied with the response, you may complain to the Information Commissioner\'s Office.',
        ar: 'يخوّلك قانون حماية البيانات في المملكة المتحدة والاتحاد الأوروبي أن تطلب نسخة من بياناتك، وأن تطلب تصحيحها، وأن تطلب محوها، وأن تعترض على طريقة معالجتها. والأول والثالث مبنيّان في صفحة الحساب فلا تحتاج إلى مراسلة أحد.\n\nوفيما سوى ذلك، أو للشكوى، اكتب إلى {email}. وإن كنت في المملكة المتحدة ولم يُرضك الجواب، فلك أن تشكو إلى مكتب مفوّض المعلومات.'
      }
    }
  ]
};

export const TERMS: LegalDocument = {
  slug: 'terms',
  title: { en: 'Terms of use', ar: 'شروط الاستخدام' },
  updated: '2026-08-03',
  intro: {
    en: 'What Sahn is, what it is not, and the terms on which you use it. The limits below are not disclaimers bolted on at the end — they describe how the software is actually built.',
    ar: 'ما سَحْن وما ليس هو، وعلى أيّ شرط تستعمله. وليست الحدود الآتية إخلاءَ مسؤولية أُلحق في آخر الكلام، بل هي وصف لكيفية بناء البرنامج.'
  },
  sections: [
    {
      heading: { en: 'Sahn does not issue fatwa', ar: 'سَحْن لا يُفتي' },
      body: {
        en: 'This is the most important term here. When you ask a question of Islamic law, Sahn does not compose a ruling. It retrieves passages from its sources, presents them with citations you can open and check, and names the school a position belongs to. Where the sources do not answer, it says so rather than filling the gap.\n\nThat is deliberate and it is a limit, not a feature to be worked around. A ruling for your situation comes from a qualified scholar who knows your circumstances. Nothing here substitutes for that, and no answer from Sahn should be quoted as though it were a fatwa.',
        ar: 'وهذا أهمّ ما في هذه الشروط. فإذا سألت مسألة فقهية لم يُنشئ سَحْن حكمًا، بل يسترجع نصوصًا من مصادره ويعرضها مع إحالات تفتحها وتتحقق منها، ويسمّي المذهب الذي إليه القول. وإذا لم تُجب المصادر صرّح بذلك ولم يسدّ الفراغ من عنده.\n\nوهذا مقصود، وهو حدٌّ لا حيلةَ تُلتمس للالتفاف عليه. فالحكم في نازلتك يصدر عن عالم مؤهَّل يعرف حالك. ولا يقوم شيء هنا مقام ذلك، ولا ينبغي أن يُنقل جواب من سَحْن على أنه فتوى.'
      }
    },
    {
      heading: {
        en: 'Not financial, legal or medical advice',
        ar: 'ليس استشارة مالية ولا قانونية ولا طبية'
      },
      body: {
        en: 'The finance guide explains structures and reports where scholars disagree. It does not recommend a product or a provider, and Sahn is not a regulated financial adviser. The zakat calculator applies rules you can read to figures you enter; check the result before you rely on it.\n\nSahn is not a medical or mental health service. Where a message discloses distress, harm or abuse, Sahn responds with support and points to crisis services. That is signposting, not treatment, and it is not a substitute for emergency help. If someone is in immediate danger, contact the emergency services where you are.',
        ar: 'دليل التمويل يشرح البنى ويذكر مواضع خلاف العلماء. ولا يوصي بمنتج ولا بمزوِّد، وليس سَحْن مستشارًا ماليًا مرخَّصًا. وحاسبة الزكاة تُطبّق قواعد منشورة على أرقام تُدخلها أنت؛ فتحقّق من النتيجة قبل الاعتماد عليها.\n\nوليس سَحْن خدمة طبية ولا نفسية. وإذا أفصحت رسالةٌ عن كرب أو أذًى أو إساءة أجاب سَحْن بالمواساة ودلّ على جهات الإغاثة. وهذه دلالة لا علاج، ولا تقوم مقام النجدة العاجلة. فإن كان أحد في خطر حالٍّ فاتصل بخدمات الطوارئ في بلدك.'
      }
    },
    {
      heading: { en: 'Times and directions', ar: 'الأوقات والاتجاهات' },
      body: {
        en: 'Prayer times, the Qibla direction and Hijri dates are computed on your device from your location, your chosen calculation method and published astronomical models. They are close, and they are not authoritative. Calculation methods differ, and a local mosque or moon-sighting authority may not agree with the figure shown.\n\nWhere the two differ, the local determination governs. Sahn shows a calculation; it does not declare a time.',
        ar: 'أوقات الصلاة واتجاه القبلة والتواريخ الهجرية تُحسب على جهازك من موقعك وطريقة الحساب التي اخترتها ونماذج فلكية منشورة. وهي قريبة، وليست حجّة. فطرق الحساب مختلفة، وقد يخالف مسجدُك أو جهةُ الرؤية ما يُعرض لك.\n\nوعند الاختلاف فالعبرة بتقرير أهل البلد. وسَحْن يعرض حسابًا ولا يُعلن وقتًا.'
      }
    },
    {
      heading: { en: 'Your account and your use', ar: 'حسابك واستعمالك' },
      body: {
        en: 'Keep access to your email secure — anyone who can read it can sign in as you, because that is what the sign-in link is.\n\nDo not attempt to overwhelm the service, extract its data in bulk, work around its safety routing, or use it to produce material that is unlawful or that would harm someone. Request limits apply to the assistant and to search; they exist to keep the service running and to keep its costs survivable, and signing in raises them.\n\nAccess may be suspended for use that breaches these terms.',
        ar: 'احفظ الوصول إلى بريدك — فمن قرأه دخل باسمك، إذ رابط الدخول هو هذا.\n\nولا تحاول إثقال الخدمة، ولا سحب بياناتها جملةً، ولا الالتفاف على توجيهها الوقائي، ولا استعمالها في إنتاج ما يخالف القانون أو يضرّ بأحد. وثمّة حدود للطلبات على المساعد والبحث، وُضعت لإبقاء الخدمة عاملة وتكاليفها محتملة، ويوسّعها تسجيلُ الدخول.\n\nوقد يُوقف الوصول عند استعمال يخالف هذه الشروط.'
      }
    },
    {
      heading: { en: 'Sources and copyright', ar: 'المصادر وحقوق النشر' },
      body: {
        en: 'Qur\'an text and translations are provided through the Quran.com content API under its terms. The hadith collection is drawn from a public-domain dataset. Du\'a translations were written for Sahn. The finance and reference material was written for Sahn.\n\nSahn quotes from its sources with citation; it does not reproduce copyrighted works in bulk, and you should not use it to try.',
        ar: 'نصّ القرآن وترجماته يُقدَّمان عبر واجهة «قرآن دوت كوم» وفق شروطها. ومجموعة الحديث مأخوذة من بيانات في الملك العام. وترجمات الأدعية كُتبت لسَحْن. ومادة التمويل والمراجع كُتبت لسَحْن.\n\nويقتبس سَحْن من مصادره مع الإحالة، ولا يعيد نشر المصنَّفات المحمية جملةً، ولا ينبغي أن تستعمله في محاولة ذلك.'
      }
    },
    {
      heading: { en: 'Availability and liability', ar: 'الإتاحة والمسؤولية' },
      body: {
        en: 'Sahn is provided as it is. It depends on services operated by others, and it can be unavailable, slow, or wrong. No warranty is given that it will be uninterrupted or that every answer will be accurate.\n\nTo the extent the law allows, Sahn is not liable for loss arising from reliance on its output. Nothing here limits liability that cannot lawfully be limited. These terms are governed by the law of England and Wales.\n\nThey may change; the date at the top of this page shows when it last did. Questions go to {email}.',
        ar: 'يُقدَّم سَحْن على حاله. وهو يعتمد على خدمات يشغّلها غيرنا، فقد يتعذّر أو يبطئ أو يخطئ. ولا يُضمن أن يعمل بلا انقطاع ولا أن يصحّ كل جواب.\n\nوفي حدود ما يسمح به القانون، لا يُسأل سَحْن عن ضرر ناشئ عن الاعتماد على مخرجاته. وليس فيما تقدّم تقييد لمسؤولية لا يجيز القانون تقييدها. وتخضع هذه الشروط لقانون إنجلترا وويلز.\n\nوقد تتغيّر، والتاريخ في أعلى الصفحة يبيّن آخر تغيير. والأسئلة إلى {email}.'
      }
    }
  ]
};

export const LEGAL_DOCUMENTS = [PRIVACY, TERMS] as const;

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((doc) => doc.slug === slug);
}
