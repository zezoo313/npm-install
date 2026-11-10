// مكتبة الحيوانات المسبقة للعبة التخمين
// تحتوي على صور عالية الجودة، أسماء عربية وتصنيفات لتسهيل اللعب الفوري

const ANIMALS_LIBRARY = [
  {
    id: "lion",
    name: "الأسد",
    category: "ثدييات مفترسة",
    emoji: "🦁",
    image: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=600&auto=format&fit=crop&q=80",
    hints: ["ملك الغابة", "يعيش في مجموعات", "له شعر كثيف حول رقبته (اللبدة)", "من الثدييات آكلات اللحوم"]
  },
  {
    id: "tiger",
    name: "النمر",
    category: "ثدييات مفترسة",
    emoji: "🐅",
    image: "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=600&auto=format&fit=crop&q=80",
    hints: ["جسمه مخطط بالأسود والبرتقالي", "سباح ماهر", "أكبر أنواع السنوريات"]
  },
  {
    id: "elephant",
    name: "الفيل",
    category: "ثدييات عشبية",
    emoji: "🐘",
    image: "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=600&auto=format&fit=crop&q=80",
    hints: ["أكبر حيوان بري على الأرض", "له خرطوم طويل وأنياب عاجية", "آكل للأعشاب"]
  },
  {
    id: "giraffe",
    name: "الزرافة",
    category: "ثدييات عشبية",
    emoji: "🦒",
    image: "https://images.unsplash.com/photo-1547721064-da6cfb341d50?w=600&auto=format&fit=crop&q=80",
    hints: ["أطول حيوان في العالم", "لها رقبة طويلة جداً وبقع بنية", "تتغذى على أوراق الأشجار العالية"]
  },
  {
    id: "dolphin",
    name: "الدولفين",
    category: "كائنات بحرية (ثدييات)",
    emoji: "🐬",
    image: "https://images.unsplash.com/photo-1570481662006-a3a1374699e8?w=600&auto=format&fit=crop&q=80",
    hints: ["كائن بحري ذكي وودود", "يتنفس الهواء بالرئات وليس بالخياشيم", "يقفز فوق أمواج البحر"]
  },
  {
    id: "camel",
    name: "الجمل",
    category: "ثدييات أليفة",
    emoji: "🐪",
    image: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=600&auto=format&fit=crop&q=80",
    hints: ["سفينة الصحراء", "يتحمل العطش لأيام طويلة", "له سنام يخزن فيه الدهون"]
  },
  {
    id: "horse",
    name: "الخيل (الحصان)",
    category: "ثدييات أليفة",
    emoji: "🐎",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    hints: ["رمز الأصالة والسرعة", "حيوان مستانس يُركب في السباقات", "له حوافر وشعر جميل"]
  },
  {
    id: "cat",
    name: "القطة",
    category: "حيوان أليف",
    emoji: "🐱",
    image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80",
    hints: ["حيوان منزلي محبوب", "تصدر صوت المواء والخرخرة", "رشيقة وتصطاد الفئران"]
  },
  {
    id: "dog",
    name: "الكلب",
    category: "حيوان أليف",
    emoji: "🐶",
    image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80",
    hints: ["أوفى صديق للإنسان", "ينبح وله حاسة شم قوية جداً", "يستخدم في الحراسة"]
  },
  {
    id: "falcon",
    name: "الصقر",
    category: "طيور جارحة",
    emoji: "🦅",
    image: "https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=600&auto=format&fit=crop&q=80",
    hints: ["طائر جارح سريع جداً ورمز العزة", "بصره حاد ومخالبه قوية", "يصطاد الفرائس من الجو"]
  },
  {
    id: "penguin",
    name: "البطريق",
    category: "طيور قطبية",
    emoji: "🐧",
    image: "https://images.unsplash.com/photo-1598439210625-5067c578f3f6?w=600&auto=format&fit=crop&q=80",
    hints: ["طائر لا يطير لكنه سباح ماهر", "يعيش في المناطق الجليدية الباردة", "يرتدي بدلة طبيعية باللونين الأبيض والأسود"]
  },
  {
    id: "kangaroo",
    name: "الكنغر",
    category: "ثدييات جرابية",
    emoji: "🦘",
    image: "https://images.unsplash.com/photo-1563281577-a7be47e20db9?w=600&auto=format&fit=crop&q=80",
    hints: ["مشهور بالقفز العالي", "يحمل صغيره في جيب أمامي (جراب)", "موطنه الأصلي أستراليا"]
  },
  {
    id: "wolf",
    name: "الذئب",
    category: "ثدييات برية مفترسة",
    emoji: "🐺",
    image: "https://images.unsplash.com/photo-1564865878688-9a244444042a?w=600&auto=format&fit=crop&q=80",
    hints: ["يعوي للقمر ورمز الذكاء والصبر", "يعيش ويصطاد في قطعان منظمة", "شديد الحذر"]
  },
  {
    id: "bear",
    name: "الدب",
    category: "ثدييات ضخمة",
    emoji: "🐻",
    image: "https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=600&auto=format&fit=crop&q=80",
    hints: ["جسم ضخم وفراء سميك", "يحب أكل العسل والأسماك", "يدخل في بيات شتوي طويل"]
  },
  {
    id: "panda",
    name: "الباندا",
    category: "ثدييات نادرة",
    emoji: "🐼",
    image: "https://images.unsplash.com/photo-1564349683136-77e08dba1ef6?w=600&auto=format&fit=crop&q=80",
    hints: ["لونه أبيض وأسود مع دوائر سوداء حول عينيه", "طعامه المفضل نبات الخيزران (البامبو)", "موطنه الغابات الصينية"]
  },
  {
    id: "fox",
    name: "الثعلب",
    category: "ثدييات برية",
    emoji: "🦊",
    image: "https://images.unsplash.com/photo-1516934024742-b461fba47600?w=600&auto=format&fit=crop&q=80",
    hints: ["مشهور بالمكر والدهاء", "ذيل كثيف وفرو برتقالي جميل", "ينشط في الليل"]
  },
  {
    id: "owl",
    name: "البومة",
    category: "طيور ليلية",
    emoji: "🦉",
    image: "https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?w=600&auto=format&fit=crop&q=80",
    hints: ["طائر ليلي مشهور بالحكمة", "عيناها كبيرتان وتستطيع تدوير رأسها 270 درجة", "طيرانها صامت تماماً"]
  },
  {
    id: "shark",
    name: "القرش",
    category: "أسماك بحرية مفترسة",
    emoji: "🦈",
    image: "https://images.unsplash.com/photo-1560275619-4662e36fa65c?w=600&auto=format&fit=crop&q=80",
    hints: ["أخطر مفترس في أعماق المحيط", "له زعنفة ظهرية مميزة وأسنان حادة تتجدد باستمرار", "لا يتوقف عن السباحة"]
  },
  {
    id: "octopus",
    name: "الأخطبوط",
    category: "رخويات بحرية",
    emoji: "🐙",
    image: "https://images.unsplash.com/photo-1545671913-b89ac1b4ac10?w=600&auto=format&fit=crop&q=80",
    hints: ["له 8 أذرع و3 قلوب", "يغير لونه للتمويه ويطلق الحبر الأسود للهرب", "كائن بحري فائق الذكاء"]
  },
  {
    id: "turtle",
    name: "السلحفاة",
    category: "زواحف",
    emoji: "🐢",
    image: "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=600&auto=format&fit=crop&q=80",
    hints: ["تحمل درعاً صلباً على ظهرها", "مشهورة بالبطء وطول العمر لأكثر من 100 عام", "من الزواحف القديمة"]
  },
  {
    id: "crocodile",
    name: "التمساح",
    category: "زواحف برمائية",
    emoji: "🐊",
    image: "https://images.unsplash.com/photo-1527525443983-6e60c75fff46?w=600&auto=format&fit=crop&q=80",
    hints: ["زاحف برمائي ضخم بفكيْن قويين جداً", "عيناه تظهران فوق سطح الماء للمراقبة", "عاش منذ عصر الديناصورات"]
  },
  {
    id: "koala",
    name: "الكوالا",
    category: "ثدييات",
    emoji: "🐨",
    image: "https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=600&auto=format&fit=crop&q=80",
    hints: ["يقضي معظم وقته نائماً على الأشجار", "يتغذى فقط على أوراق شجر الأوكالبتوس", "حيوان لطيف وهادئ"]
  }
];

// أسئلة مقترحة سريعة لتسهيل السؤال بنقرة واحدة
const QUICK_QUESTIONS = [
  "هل هو من الثدييات؟",
  "هل يعيش في الماء أو البحر؟",
  "هل يستطيع الطيران؟",
  "هل هو حيوان مفترس؟",
  "هل هو حيوان أليف يُربى في المنازل؟",
  "هل حجمه أكبر من الإنسان؟",
  "هل يتغذى على اللحوم؟",
  "هل يعيش في الغابات أو الأدغال؟",
  "هل يعيش في الصحراء؟",
  "هل ينشط في الليل؟",
  "هل له فراء أو شعر؟",
  "هل له أربعة أرجل؟"
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ANIMALS_LIBRARY, QUICK_QUESTIONS };
}
