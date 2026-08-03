/**
 * Halal finance reference.
 *
 * ⚠️ EDUCATIONAL CONTENT, NOT ADVICE — and it needs review before launch by
 * someone qualified in both Islamic finance and the relevant regulation. It
 * explains structures and names the scholarly disagreements; it never
 * recommends a product, a provider, or a course of action, and the spec is
 * explicit that it must not.
 *
 * Where a critique exists it is stated alongside the structure rather than
 * omitted — a guide that presents only the marketing case for a product is
 * worse than no guide.
 */

export type Bilingual = { en: string; ar: string };

export type Section = {
  heading: Bilingual;
  body: Bilingual;
};

export type Topic = {
  slug: string;
  /** 'all' shows everywhere; others are surfaced under their region. */
  region: 'all' | 'gb' | 'gulf';
  title: Bilingual;
  summary: Bilingual;
  sections: Section[];
};

export const TOPICS: readonly Topic[] = [
  {
    slug: 'riba',
    region: 'all',
    title: { en: 'Riba, and why it matters', ar: 'الربا ولماذا يهمّ' },
    summary: {
      en: 'What riba is, the two classical categories, and why the prohibition shapes everything else in this guide.',
      ar: 'ما الربا، وقسماه عند الفقهاء، ولماذا يحكم تحريمه كل ما في هذا الدليل.'
    },
    sections: [
      {
        heading: { en: 'The prohibition', ar: 'التحريم' },
        body: {
          en: 'Riba is usually rendered as interest, though the classical category is wider: an unjustified increase taken in an exchange. The prohibition is stated directly in the Qur\'an — 2:275-279 is the passage most often cited — and it is one of the few commercial rules on which the schools do not substantially differ.\n\nWhat follows from it is structural rather than cosmetic. A contract cannot be made permissible by renaming the interest; the question is always whether the return is earned by taking real risk on a real asset, or simply by lending money against time.',
          ar: 'يُترجم الربا عادةً بالفائدة، والمعنى الفقهي أوسع: زيادة بلا عوض في المعاوضة. والتحريم منصوص عليه في القرآن — والآيات ٢٧٥-٢٧٩ من البقرة أشهر ما يُستشهد به — وهو من قليل من أحكام المعاملات التي لا تختلف فيها المذاهب اختلافًا معتبرًا.\n\nوما يترتب عليه بنيويّ لا شكليّ. فلا يصير العقد جائزًا بتغيير اسم الفائدة؛ والسؤال دائمًا: هل جاء الربح من تحمّل مخاطرة حقيقية في أصل حقيقي، أم من إقراض المال مقابل الزمن؟'
        }
      },
      {
        heading: { en: 'Two categories', ar: 'قسمان' },
        body: {
          en: 'Classical works divide riba into riba al-nasi\'ah — the increase tied to deferral, which covers conventional lending — and riba al-fadl, an unequal exchange of the same commodity. Most contemporary discussion concerns the first.\n\nThe practical consequence is that a Muslim assessing a financial product asks what the counterparty is being paid for. Rent on an asset, a profit share, or a mark-up on a genuine sale are treated differently from a charge for the use of money.',
          ar: 'يقسم الفقهاء الربا إلى ربا النسيئة — الزيادة مقابل التأجيل، وهو ما ينطبق على الإقراض التقليدي — وربا الفضل، وهو التفاضل في بيع الجنس بجنسه. وأكثر الكلام المعاصر في الأول.\n\nوثمرة ذلك عمليًا أن المسلم حين ينظر في منتج مالي يسأل: على ماذا يتقاضى الطرف الآخر؟ فالأجرة على أصل، أو المشاركة في الربح، أو الربح في بيع حقيقي، تختلف عن أجرٍ على استعمال المال.'
        }
      }
    ]
  },
  {
    slug: 'home-purchase',
    region: 'all',
    title: { en: 'Islamic home purchase', ar: 'تمويل شراء المسكن' },
    summary: {
      en: 'Murabaha, Ijara and diminishing Musharaka — how each is structured, and the criticisms each attracts.',
      ar: 'المرابحة والإجارة والمشاركة المتناقصة: بنية كل منها، وما وُجّه إليها من نقد.'
    },
    sections: [
      {
        heading: { en: 'Murabaha', ar: 'المرابحة' },
        body: {
          en: 'The financier buys the property and immediately resells it to the customer at a disclosed mark-up, payable in instalments. Ownership passes at the outset; the debt is fixed and does not grow with time.\n\nThe critique is that where the financier holds the asset for only moments and bears no meaningful risk, the mark-up tracks prevailing interest rates so closely that the substance is a loan in another form. Scholars who permit it argue the sale is genuine and the risk, however brief, is real.',
          ar: 'يشتري الممول العقار ثم يبيعه للعميل في الحال بربح معلوم يُسدَّد أقساطًا. فتنتقل الملكية ابتداءً، والدين ثابت لا يزيد بمرور الزمن.\n\nوالنقد الموجّه إليها أن الممول إذا لم يحز الأصل إلا لحظات ولم يتحمل مخاطرة معتبرة، وكان الربح يتبع أسعار الفائدة السائدة، صار المآل قرضًا بصورة أخرى. ومن أجازها يرى أن البيع حقيقي وأن المخاطرة على قصرها واقعة.'
        }
      },
      {
        heading: { en: 'Ijara and diminishing Musharaka', ar: 'الإجارة والمشاركة المتناقصة' },
        body: {
          en: 'Under Ijara the financier owns the property and leases it, with ownership transferring at the end. Under diminishing Musharaka the two parties co-own it: the customer pays rent on the financier\'s share while buying that share down over time.\n\nDiminishing Musharaka is generally regarded as the strongest of the three, because the financier holds real ownership and therefore real exposure. The recurring criticism is that where the rent is benchmarked to an interest rate, and where the customer bears all maintenance and insurance despite being a part-owner only, the partnership is thinner than it appears.',
          ar: 'في الإجارة يملك الممول العقار ويؤجّره، ثم تنتقل الملكية في النهاية. وفي المشاركة المتناقصة يشترك الطرفان في الملك: يدفع العميل أجرة حصة الممول ويشتريها منه شيئًا فشيئًا.\n\nوتُعدّ المشاركة المتناقصة أقواها عند كثيرين، لأن الممول مالك حقيقة فهو متحمّل للمخاطرة حقيقة. ويبقى النقد المتكرر أن الأجرة إذا رُبطت بسعر فائدة، وتحمّل العميل الصيانة والتأمين كاملة وهو شريك بحصة، صارت الشركة أرقّ مما تبدو.'
        }
      }
    ]
  },
  {
    slug: 'screening',
    region: 'all',
    title: { en: 'Screening shares and funds', ar: 'فرز الأسهم والصناديق' },
    summary: {
      en: 'How AAOIFI\'s screens work — the business activity test and the financial ratios — and what they do not settle.',
      ar: 'كيف تعمل معايير أيوفي: فرز النشاط والنِّسب المالية، وما لا تحسمه.'
    },
    sections: [
      {
        heading: { en: 'The activity screen', ar: 'فرز النشاط' },
        body: {
          en: 'The first test is what the company does. Conventional banking and insurance, alcohol, pork, gambling, tobacco and adult entertainment are excluded outright. A small tolerance is usually allowed for incidental revenue from prohibited sources — commonly 5% of total income — with that portion given away rather than kept.',
          ar: 'أول ما يُنظر فيه نشاط الشركة. فتُستبعد ابتداءً البنوك والتأمين التقليدي والخمر ولحم الخنزير والميسر والتبغ والترفيه الإباحي. ويُتسامح عادةً في إيراد عارض من مصدر محرّم — بحدود ٥٪ من مجموع الدخل غالبًا — على أن يُتخلَّص منه لا أن يُستبقى.'
        }
      },
      {
        heading: { en: 'The financial ratios', ar: 'النِّسب المالية' },
        body: {
          en: 'A company can pass the activity screen and still fail on its balance sheet. AAOIFI\'s standards apply thresholds to interest-bearing debt, to interest-bearing deposits and investments, and to receivables, each measured against market capitalisation or total assets depending on the standard applied. A company carrying too much conventional debt is excluded even if its business is unobjectionable.\n\nThe screens are a filter, not a verdict. Index providers apply different thresholds and different denominators, so the same company can be included by one screen and excluded by another — which is why two "sharia-compliant" funds can hold visibly different portfolios. The exact current thresholds should be read from AAOIFI\'s published standards rather than taken from a summary.',
          ar: 'قد تجتاز الشركة فرز النشاط ثم تسقط في ميزانيتها. فتضع معايير أيوفي حدودًا للديون ذات الفائدة، وللودائع والاستثمارات ذات الفائدة، وللذمم المدينة، كلٌّ منسوبًا إلى القيمة السوقية أو مجموع الأصول بحسب المعيار المطبَّق. فتُستبعد الشركة كثيرة الدين التقليدي وإن كان نشاطها سليمًا.\n\nوهذه المعايير مِصفاة لا حكمًا نهائيًا. فمزوّدو المؤشرات يختلفون في الحدود وفي المقام، فتدخل الشركة في فرز وتخرج من آخر — ولهذا يختلف محتوى صندوقين يوصفان معًا بالتوافق مع الشريعة. وينبغي أخذ الحدود الجارية من معايير أيوفي المنشورة لا من ملخّص.'
        }
      }
    ]
  },
  {
    slug: 'pensions',
    region: 'gb',
    title: { en: 'Workplace pensions', ar: 'معاشات العمل' },
    summary: {
      en: 'What a default fund usually holds, what sharia fund options exist, and the trade-offs in switching.',
      ar: 'ما يحويه الصندوق الافتراضي عادةً، وما البدائل المتوافقة، وما يترتب على التحويل.'
    },
    sections: [
      {
        heading: { en: 'The default fund', ar: 'الصندوق الافتراضي' },
        body: {
          en: 'Auto-enrolment in the UK places contributions in a default fund unless the member chooses otherwise. Default funds are broad-market and typically hold conventional banks, insurers and interest-bearing bonds — none of which pass an activity screen.\n\nMost large workplace schemes now offer a sharia fund as an alternative, usually an equity fund tracking a screened index. Members are generally not told this at enrolment, so the choice has to be sought out.',
          ar: 'يضع التسجيل التلقائي في بريطانيا الاشتراكات في صندوق افتراضي ما لم يختر المشترك غيره. والصناديق الافتراضية عريضة السوق، تحوي عادةً بنوكًا وشركات تأمين تقليدية وسندات ذات فائدة، ولا يجتاز شيء منها فرز النشاط.\n\nوأكثر برامج العمل الكبيرة تتيح اليوم صندوقًا متوافقًا بديلًا، وهو غالبًا صندوق أسهم يتابع مؤشرًا مفروزًا. ولا يُخبَر المشتركون بذلك عند التسجيل عادةً، فيلزم السؤال عنه.'
        }
      },
      {
        heading: { en: 'What switching costs', ar: 'ما يكلّفه التحويل' },
        body: {
          en: 'A screened equity fund is usually all-equity, so it carries more volatility than a default fund that shifts towards bonds as retirement approaches. Charges are often higher, and the choice of funds narrower. Employer contributions are not affected by the switch.\n\nThose are trade-offs to weigh, not reasons either way. Sahn does not recommend a fund, and the scheme\'s own documents and a qualified adviser are the right places to take this.',
          ar: 'الصندوق المفروز غالبًا كله أسهم، فتقلّبه أشدّ من صندوق افتراضي يتحوّل نحو السندات كلما اقترب التقاعد. ورسومه أعلى في الغالب، وخياراته أضيق. ولا تتأثر مساهمة صاحب العمل بالتحويل.\n\nوهذه موازنات تُوزن، لا حجج لأحد الطرفين. وصحن لا يرشّح صندوقًا، ومَرجِع ذلك وثائق البرنامج نفسه ومستشار مؤهل.'
        }
      }
    ]
  },
  {
    slug: 'takaful',
    region: 'all',
    title: { en: 'Takaful', ar: 'التكافل' },
    summary: {
      en: 'The cooperative alternative to conventional insurance, and where the objection to insurance actually lies.',
      ar: 'البديل التعاوني عن التأمين التقليدي، وموضع الاعتراض على التأمين حقيقةً.'
    },
    sections: [
      {
        heading: { en: 'The objection and the structure', ar: 'الاعتراض والبنية' },
        body: {
          en: 'The objection to conventional insurance rests on gharar — excessive uncertainty in the contract — alongside the interest earned on premium reserves, and for some scholars an element of gambling in the exchange itself.\n\nTakaful restructures it as mutual assistance: participants contribute to a common fund from which claims are paid, and the operator manages that fund for a fee or a share of investment profit rather than owning the surplus. Reserves are invested only in screened assets, and a surplus may be returned to participants.',
          ar: 'يقوم الاعتراض على التأمين التقليدي على الغرر — وهو الجهالة الفاحشة في العقد — ومعه الفائدة المكتسبة على أموال الأقساط، ويرى بعض أهل العلم فيه شبهة الميسر في أصل المعاوضة.\n\nويعيد التكافل بناءه على التعاون: يتبرع المشتركون بأقساطهم في صندوق مشترك تُدفع منه التعويضات، ويدير المشغّل الصندوق بأجرة أو بحصة من ربح الاستثمار لا بملك الفائض. ولا تُستثمر الأموال إلا في أصول مفروزة، وقد يُردّ الفائض على المشتركين.'
        }
      },
      {
        heading: { en: 'Where cover is compulsory', ar: 'حين يكون التأمين إلزاميًا' },
        body: {
          en: 'Takaful is widely available in the Gulf and Malaysia and thin in the UK, where motor cover is a legal requirement. Scholars addressing that gap have generally held that taking the minimum legally required cover is permitted under necessity where no takaful alternative exists — a position on constraint, not an endorsement of the product.',
          ar: 'والتكافل متوافر في الخليج وماليزيا، قليل في بريطانيا حيث تأمين المركبات إلزام قانوني. وقد ذهب من تكلّم في هذه الحال إلى جواز الاقتصار على الحد الأدنى الذي يلزم به القانون للضرورة عند فقد البديل التكافلي — وهو حكم على حال الاضطرار لا إقرارٌ للمنتج.'
        }
      }
    ]
  },
  {
    slug: 'isas',
    region: 'gb',
    title: { en: 'ISAs and tax wrappers', ar: 'حسابات الادخار المعفاة (ISA)' },
    summary: {
      en: 'An ISA is a tax wrapper, not an investment — what matters is what sits inside it.',
      ar: 'حساب الـISA غلاف ضريبي لا استثمار — والعبرة بما يوضع فيه.'
    },
    sections: [
      {
        heading: { en: 'The wrapper and its contents', ar: 'الغلاف ومحتواه' },
        body: {
          en: 'An ISA is a tax treatment applied to whatever is held inside it, not a product in itself. A cash ISA pays interest and so raises the question directly. A stocks and shares ISA raises no issue of its own — the question is entirely what the underlying holdings are, which returns to the screening above.\n\nThe same reasoning applies to any tax wrapper in any jurisdiction: assess the assets, not the label on the account.',
          ar: 'الـISA معاملة ضريبية تُطبَّق على ما يوضع بداخله لا منتج في ذاته. فحساب النقد منه يدفع فائدة فيرد السؤال مباشرة. وأما حساب الأسهم فلا إشكال فيه من جهته، وإنما السؤال في الأصول المملوكة داخله، وهو ما يعود بنا إلى الفرز المتقدم.\n\nويجري النظر نفسه في كل غلاف ضريبي في أي بلد: انظر في الأصول لا في اسم الحساب.'
        }
      }
    ]
  }
];

export function getTopic(slug: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug);
}
