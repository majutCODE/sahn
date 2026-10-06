/**
 * Explanatory content for the zakat page.
 *
 * The calculator was 180 words of interface on a page competing for queries
 * like "zakat on gold" and "what is the nisab" - questions the tool answers
 * by implication but the page never actually addressed. This is written for
 * the reader first; that it also gives the page something to rank for is a
 * consequence rather than the reason.
 *
 * It explains the rules the calculator applies and names the disagreements it
 * cannot resolve. It does not tell anyone what to pay.
 */

export type Bilingual = { en: string; ar: string };
export type GuideSection = { heading: Bilingual; body: Bilingual };

export const ZAKAT_GUIDE: GuideSection[] = [
  {
    heading: { en: 'What the nisab is', ar: 'ما النصاب' },
    body: {
      en: 'Zakat is owed only once your wealth passes a threshold called the nisab. Classically that threshold is 87.48 grams of gold or 612.36 grams of silver, and it is expressed in metal because currencies did not hold their value in any stable way.\n\nThe two give very different answers today. Silver has fallen against gold over the centuries, so the silver nisab is far lower, which means more people owe zakat under it. Many scholars prefer silver for exactly that reason: it brings more wealth into the obligation and benefits more recipients. Others hold that gold better reflects what the threshold was originally worth. Both positions are held by serious people, and the calculator lets you choose which to apply rather than deciding for you.',
      ar: 'لا تجب الزكاة إلا إذا بلغ المال قدرًا يسمّى النصاب. وهو في كلام الفقهاء ٨٧٫٤٨ غرامًا من الذهب أو ٦١٢٫٣٦ غرامًا من الفضة، وإنما قُدِّر بالمعدن لأن النقود لم تكن تثبت على قيمة.\n\nوالقدران يختلفان اليوم اختلافًا كبيرًا. فقد هبطت الفضة في مقابل الذهب على مرّ القرون، فصار نصابها أدنى بكثير، فيجب بها على عدد أكبر. ولهذا رجّح كثير من أهل العلم الفضة: لأنها تُدخل مالًا أكثر في الوجوب فينتفع بها فقراء أكثر. وذهب آخرون إلى أن الذهب أقرب إلى ما كان عليه النصاب في أصله. والقولان يقول بهما أهل نظر، والحاسبة تدعك تختار أيّهما تعمل به ولا تختار عنك.'
    }
  },
  {
    heading: { en: 'The hawl, and why the date matters', ar: 'الحول ولماذا يهمّ تاريخه' },
    body: {
      en: 'Zakat falls due when wealth above the nisab has been held for one lunar year, called the hawl. The year runs on the Hijri calendar, which is about eleven days shorter than the Gregorian one, so the date drifts earlier each year against a Western calendar.\n\nWhat matters is that the wealth stayed above the nisab across the whole year, not that it never moved. Money coming in and going out does not restart the clock; dropping below the threshold does. The calculator records the date you worked it out and shows when the next hawl falls, because the most common mistake here is not miscalculating the amount but losing track of the date.',
      ar: 'تجب الزكاة إذا حال على المال الزائد على النصاب حولٌ قمري. والسنة فيه هجرية، وهي أقصر من الميلادية بنحو أحد عشر يومًا، فيتقدّم موعدها كل عام في التقويم الغربي.\n\nوالمعتبر بقاء المال فوق النصاب في الحول كله، لا أن يبقى ساكنًا. فدخول المال وخروجه لا يستأنف به الحول، وإنما يستأنف بالنزول عن النصاب. والحاسبة تحفظ تاريخ حسابك وتبيّن متى يحلّ الحول التالي، فإن أكثر ما يقع فيه الخطأ ليس في المقدار بل في نسيان التاريخ.'
    }
  },
  {
    heading: { en: 'What is counted, and what is not', ar: 'ما يُحسب وما لا يُحسب' },
    body: {
      en: 'Zakat is owed on wealth that grows or could grow: cash wherever it sits, gold and silver, money owed to you that you expect to receive, business stock held for sale, and investments held to trade.\n\nIt is not owed on what you use. Your home, your car, your furniture, the tools of your trade and the clothes you wear are outside it however much they are worth. The principle is the distinction between wealth held and wealth used, not between rich and poor.\n\nDebts you owe are deducted before the threshold is tested, which is why the calculator subtracts them first rather than afterwards. A long-term mortgage is the contested case: some deduct only the instalments falling due within the year, others the whole outstanding balance, and the two give very different answers. The calculator flags that choice rather than quietly making it.',
      ar: 'تجب الزكاة في المال النامي أو القابل للنماء: النقد حيث كان، والذهب والفضة، والدين المرجوّ أداؤه، وعروض التجارة، والاستثمارات المتخذة للمتاجرة.\n\nولا تجب فيما يُستعمل. فدارك ومركبتك وأثاثك وآلة حرفتك وثيابك خارجة عنها مهما بلغت قيمتها. والأصل في ذلك الفرق بين مال مُقتنى ومال مُستعمَل، لا بين غني وفقير.\n\nوتُحطّ الديون قبل النظر في بلوغ النصاب، ولذلك تطرحها الحاسبة أولًا لا آخرًا. والمسألة المختلف فيها دين الإسكان الطويل: فمنهم من يطرح أقساط السنة فقط، ومنهم من يطرح الرصيد كله، والفرق بين القولين كبير. والحاسبة تنبّه على هذا الاختيار ولا تمضيه في صمت.'
    }
  },
  {
    heading: { en: 'The rate, and what this page does not do', ar: 'المقدار وما لا تفعله هذه الصفحة' },
    body: {
      en: 'The rate is 2.5% of the whole amount once the nisab is met, not 2.5% of the excess above it. That catches people out: someone just over the threshold owes zakat on everything they hold, not on the few pounds by which they cleared it.\n\nThis page applies published rules to figures you enter. It is not a ruling on your situation, and it cannot be: whether a particular asset is zakatable, how to treat a pension you cannot access, what to do about a business part-owned with someone else - these are questions for someone qualified who can hear the details. What the calculator can do is the arithmetic, transparently, and show you which rule it applied.',
      ar: 'والمقدار ربع العشر من جميع المال إذا بلغ النصاب، لا من الزائد عليه. وهذا موضع يغلط فيه كثير: فمن جاوز النصاب بقليل زكّى ماله كله، لا ذلك القليل.\n\nوهذه الصفحة تطبّق قواعد منشورة على أرقام تُدخلها أنت. وليست حكمًا في حالك ولا يمكن أن تكون: فكون أصل بعينه تجب فيه الزكاة، وكيف يُعامل معاشٌ لا تملك الوصول إليه، وما العمل في شركة بينك وبين غيرك — هذه مسائل لمن يملك النظر فيها بعد سماع التفصيل. وإنما تحسن الحاسبة الحساب، بوضوح، وتبيّن أيّ قاعدة طبّقت.'
    }
  }
];

/** Questions a reader actually types, answered from the rules above. */
export const ZAKAT_FAQ: GuideSection[] = [
  {
    heading: { en: 'Is zakat due on gold jewellery you wear?', ar: 'هل في الحليّ المستعمل زكاة؟' },
    body: {
      en: 'The schools differ. The Hanafi position is that gold and silver are zakatable whatever they are used for, including jewellery in regular use. The Maliki, Shafi\'i and Hanbali positions generally exempt jewellery worn as adornment, while taxing gold held as a store of value. The calculator includes gold you enter and does not ask what it is for, so apply whichever position you follow when deciding what to enter.',
      ar: 'اختلف الفقهاء. فمذهب الحنفية وجوبها في الذهب والفضة على أي وجه استُعملا، ومنه الحليّ المستعمل. وذهب المالكية والشافعية والحنابلة في الجملة إلى إعفاء ما يُلبس للزينة، وإيجابها فيما اتُّخذ للادّخار. والحاسبة تحسب ما تُدخله من الذهب ولا تسأل عن وجهه، فأدخل ما يوافق ما تعمل به.'
    }
  },
  {
    heading: { en: 'Which nisab should you use, gold or silver?', ar: 'بأيّ النصابين تأخذ: الذهب أم الفضة؟' },
    body: {
      en: 'Neither is wrong. Silver gives a much lower threshold today, so more people owe and more is distributed; many contemporary scholars prefer it for that reason. Gold gives a higher threshold closer to what the original measure was worth in practice. If you follow a particular scholar or school, use their position. If you have no view, the silver basis is the more cautious of the two in the sense that it errs towards paying.',
      ar: 'لا يُخطَّأ أحدهما. فالفضة تعطي نصابًا أدنى بكثير اليوم، فيجب على أكثر ويُنفق أكثر، ولهذا رجّحها كثير من المعاصرين. والذهب يعطي نصابًا أعلى أقرب إلى ما كان عليه المقدار في واقعه. فإن كنت تتبع عالمًا أو مذهبًا فخذ بقوله. وإن لم يكن لك قول فالأخذ بالفضة أحوط من جهة أنه أقرب إلى الأداء.'
    }
  },
  {
    heading: { en: 'Do you deduct a mortgage?', ar: 'هل يُطرح دين الإسكان؟' },
    body: {
      en: 'This is the most contested deduction in ordinary practice. One position deducts only the instalments due within the coming year, on the reasoning that the rest is not yet payable. Another deducts the entire outstanding balance as a debt genuinely owed. The difference can decide whether you owe anything at all, which is why the calculator marks it as contested rather than choosing for you.',
      ar: 'هذا أكثر ما يُختلف في طرحه في العمل الجاري. فقول يطرح أقساط السنة المقبلة فقط، لأن ما بعدها غير مستحقّ بعد. وقول يطرح الرصيد كله لأنه دين لازم حقيقة. والفرق بينهما قد يحسم هل عليك شيء أصلًا، ولذلك وسمته الحاسبة بأنه موضع خلاف ولم تختر عنك.'
    }
  }
];
