# tfkir.net — الدكتور ياسر حسن

موقع شخصي لـالدكتور ياسر حسن: التفكير الطبي، والمشاريع، والمحاضرات.
موقع ثابت (Static) بلا إطار عمل وبلا قاعدة بيانات، ومنشور على **Cloudflare Pages**.

---

## البنية

```
index.html …            الصفحات المولَّدة (المحتوى النهائي)
assets/css/             base · components · pages
assets/js/app.js        الوظائف العامة (سمة، قائمة، كشف، نموذج…)
assets/js/cloud.js      نافذة الخدمة الحالية العائمة
assets/img/             الصور والأيقونات
functions/api/contact.js Cloudflare Pages Function — استقبال رسائل النموذج
tools/content.mjs       ← المصدر الوحيد للمحتوى (عدّله أولًا)
tools/pages.mjs         قوالب الصفحات
tools/render.mjs        الهيكل العام (هيدر، فوتر، SEO، JSON-LD)
tools/icons.mjs         أيقونات SVG
tools/build.mjs         مُولّد الموقع
```

## الخدمة الحالية

تظهر الخدمة (الدورة) الحالية في **نافذة عائمة فقط**، تُعرَّف في `tools/content.mjs` تحت `now`.
لا يوجد عدّاد ولا موعد إغلاق: تبقى معروضة حتى تُحدَّث أو تُحذف يدويًا.

## تعديل المحتوى

1. عدّل `tools/content.mjs` فقط.
2. شغّل:

```bash
npm run build
```

3. ادفع التغييرات — Cloudflare Pages سيعيد النشر تلقائيًا.

> markers على شكل `TODO` في `content.mjs` هي الفراغات المخصّصة لملء المحتوى.
> راجع `CONTENT.md` لقائمة ما يجب تعبئته.

## النشر

- المستودع: GitHub
- المشروع: Cloudflare Pages (تكامل Git)
- النطاق: `tfkir.net` مربوط بالمشروع
- أمر البناء: **فارغ** (المخرجات جاهزة في الجذر)
- مجلد الإخراج: `/`

## التحديث التلقائي بعد النشر

- صفحات HTML تُقدَّم بـ `Cache-Control: max-age=0, must-revalidate` — كل زيارة تتحقق من النسخة الجديدة.
- الأصول (CSS/JS/الصور/الأيقونات) تُحمَّل ببصمة `?v=<hash>` فلا تختلط نسخة قديمة بأخرى جديدة في المتصفح.
- `version.json` (بلا تخزين) + فحص دوري في `app.js`: إذا كانت الصفحة مفتوحة ونُشرت نسخة جديدة تُعاد تحميلها تلقائيًا، ويتأجّل التحديث مؤقتًا إن كان الزائر يكتب في حقل نصي.

## نموذج التواصل

يعمل عبر Cloudflare Pages Function في `functions/api/contact.js`.
بدون إعداد إضافي يعمل التحقق والمصيدة، ويعيد الموقع الردّ بـ `503`
فتتح رسالة `mailto:` عند الزائر كبديل آمن.

لتفعيل الإرسال الحقيقي، اضبط متغيّرًا سرّيًا في إعدادات Pages:

```
CONTACT_WEBHOOK_URL   رابط Webhook (Make / Zapier / n8n / Cloudflare Worker)
```

أو أضف مفتاح `RESEND_API_KEY` + `CONTACT_TO` للإرسال عبر Resend
(يتطلب إضافة سطر واحد في الدالة).

## الدومين

```
tfkir.net      CNAME  <project>.pages.dev
www.tfkir.net  CNAME  <project>.pages.dev
```
