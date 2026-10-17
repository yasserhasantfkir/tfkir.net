/* ---------- ستة ميادين ---------- */
export const domains = [
  { t: "التفكير الطبي", p: "مشروع التفكير الطبي الجوهري: تعديل سلوك المريض بتعليمه كيف يفكّر في مرضه، لا بتلقينه التعليمات وحدها." },
  { t: "المنطق والحِجاج", p: "تدريب منظّم على قوة الاستدلال وسطوة الحوار، من القاعدة المنطقية إلى المناظرة الحيّة." },
  { t: "اللغة والبيان", p: "اللسان العربي أداة تفكير قبل أن يكون أداة تعبير، ودقة العبارة هي أول دقةٍ في الفكرة." },
  { t: "التحقيق والتجديد", p: "فحص الدعاوى قبل قبولها، وبناء منهجيات جديدة بدل ترديد القديمة." },
  { t: "الدعوة والنهضة", p: "إصلاح التفكير مدخلاً لإصلاح الأمة، وقراءة تجديدية للخدمة القرآنية في رسائل النور." },
  { t: "آفات التفكير", p: "دراسة الغباء وأنماط الخطأ الذهني: كيف تنشأ، وكيف نتّقيها في أنفسنا قبل غيرنا." },
];

/* ============================================================
   tools/content.mjs — المصدر الوحيد لمحتوى الموقع
   ============================================================
   عدّل هذا الملف فقط ثم شغّل:  npm run build
   العناصر الموسومة بـ  TODO  هي الفراغات المخصّصة لملء المحتوى.
   ============================================================ */

export const site = {
  domain: "tfkir.net",
  origin: "https://tfkir.net",
  lang: "ar",
  dir: "rtl",
  locale: "ar_SA",
  themeColor: "#0a0f15",
  tagline: "إصلاح التفكير مفتاح كل إصلاح",
  shortName: "تفكير.نت",
  publishedAt: "2025-12-09",
  updatedAt: "2026-10-17",
};

/* ---------- هوية الطبيب ---------- */
export const doctor = {
  nameAr: "الدكتور ياسر حسن",
  nameShort: "د. ياسر حسن",
  nameEn: "Dr. Yasser Hassan",
  initials: "ي ح",
  latinInitials: "YH",
  roleLine: "طبيب باطنة · باحث في التفكير والنهضة",
  title: "إصلاح التفكير مفتاح كل إصلاح",
  subtitle:
    "منصة فكرية وتدريبية يقودها الدكتور ياسر حسن: منظّمة حول فرضية واحدة — مشكلات الفرد والمجتمع والأمة تُحلّ حين يُصلَح التفكير وتُقوّى مهاراته. نظريات ومنهجيات ودورات في الطب والمنطق والحِجاج واللغة والنهضة والتحقيق والتجديد.",
  portrait: "assets/img/doctor-yasser.jpg",
  email: "tafkiryas@gmail.com",
  emailPress: "tafkiryas@gmail.com",
  phone: "+905370468203",
  whatsapp: "+905370468203",
  city: "",
  country: "",
  timezone: "Asia/Riyadh",
  availability: "متاح للحوارات والدورات والتعاون الفكري",
  specialties: [
    "التفكير الطبي",
    "المنطق والحِجاج",
    "اللغة والبيان",
    "التحقيق والتجديد",
    "الدعوة والنهضة",
    "آفات التفكير",
  ],
  socials: {
    x: "",
    instagram: "https://www.instagram.com/dryaasirsyr",
    facebook: "https://www.facebook.com/dryaasir.syr",
    linkedin: "",
    youtube: "",
    telegram: "",
    whatsapp: "https://wa.me/905370468203",
    github: "",
    email: "tafkiryas@gmail.com",
  },
  socialOrder: ["email", "facebook", "instagram", "whatsapp", "x", "linkedin", "youtube", "telegram", "github"],
};

/* ---------- التنقل ---------- */
export const nav = [
  { href: "/", label: "الرئيسية" },
  { href: "/about.html", label: "عن الدكتور" },
  { href: "/thinking.html", label: "التفكير الطبي" },
  { href: "/ideas.html", label: "الأفكار" },
  { href: "/projects.html", label: "المشاريع" },
  { href: "/talks.html", label: "المحاضرات" },
  { href: "/links.html", label: "الروابط" },
  { href: "/contact.html", label: "اتصل بنا" },
];

/* ---------- الشريط المتحرك ---------- */
export const marquee = [
  "إصلاح التفكير مفتاح كل إصلاح",
  "التفكير قبل العلاج",
  "السؤال الصحيح نصف التشخيص",
  "الإنسان قبل المرض",
  "البحث قبل التبنّي",
  "الكتابة قبل النسيان",
];

/* ---------- مبادئ التفكير الطبي ---------- */
export const principles = [];

/* ---------- مسارات التفكير ---------- */
export const reasoning = [];

/* ---------- القيم ---------- */
export const values = [];

/* ---------- السيرة ---------- */
export const timeline = [];

/* ---------- أفكار ومقالات ---------- */
export const ideas = [];

export const ideaCategories = [
  "الكل",
  "التفكير الطبي",
  "الأدلة",
  "التعليم",
  "الكتابة",
  "الممارسة",
  "المشاريع",
  "تأملات",
];

/* ---------- المشاريع ---------- */
export const projects = [];

export const projectFilters = ["الكل", "منشور", "قيد التطوير", "فكرة"];

/* ---------- المحاضرات والحوارات ---------- */
export const talks = [];

export const talkTypes = ["الكل", "محاضرة", "حوار", "ورشة", "لقاء"];

/* ---------- صفحة الروابط ---------- */
export const linkGroups = [
  {
    title: "تواصل مباشر",
    key: "contact",
    links: [
      { name: "البريد الإلكتروني", desc: "tafkiryas@gmail.com", url: "mailto:tafkiryas@gmail.com", icon: "mail", primary: true },
      { name: "الهاتف / واتساب", desc: "+905370468203", url: "https://wa.me/905370468203", icon: "whatsapp" },
      { name: "فيسبوك", desc: "dryaasir.syr", url: "https://www.facebook.com/dryaasir.syr", icon: "facebook" },
      { name: "إنستغرام", desc: "@dryaasirsyr", url: "https://www.instagram.com/dryaasirsyr", icon: "instagram" },
      { name: "نموذج التواصل", desc: "رسالة مباشرة من الموقع", url: "/contact", icon: "send" },
    ],
  },
  {
    title: "الأفكار والمحتوى",
    key: "content",
    links: [
      { name: "كل الأفكار", desc: "مقالات وملاحظات", url: "/ideas", icon: "book" },
      { name: "التفكير الطبي", desc: "المنهجية والمبادئ", url: "/thinking", icon: "brain" },
      { name: "المشاريع", desc: "أدوات تُبنى", url: "/projects", icon: "spark" },
      { name: "المحاضرات", desc: "جلسات وحوارات", url: "/talks", icon: "mic" },
    ],
  },
];

/* ---------- أسئلة شائعة ---------- */
/* ---------- الفوتر ---------- */
export const footer = {
  tagline: "منصة فكرية وتدريبية يقودها الدكتور ياسر حسن: نظريات ومنهجيات ودورات في الطب والمنطق والحِجاج واللغة والنهضة.",
  cols: [
    {
      title: "التنقل",
      links: [
        { label: "الرئيسية", href: "/" },
        { label: "عن الدكتور", href: "/about" },
        { label: "التفكير الطبي", href: "/thinking" },
        { label: "المحاضرات", href: "/talks" },
      ],
    },
    {
      title: "المحتوى",
      links: [
        { label: "الأفكار", href: "/ideas" },
        { label: "المشاريع", href: "/projects" },
        { label: "الروابط", href: "/links" },
        { label: "اتصل بنا", href: "/contact" },
      ],
    },
    {
      title: "معلومات",
      links: [
        { label: "سياسة الخصوصية", href: "/privacy" },
        { label: "خريطة الموقع", href: "/sitemap.xml" },
      ],
    },
  ],
};