// يولّد الموقع الثابت داخل مجلد dist من ملفات *.app.json. بلا مكتبات خارجية.
const fs = require('fs'), p = require('path');
const R = __dirname, D = p.join(R, 'dist');
const J = f => JSON.parse(fs.readFileSync(p.join(R, f), 'utf8'));
const site = J('site.json');
const apps = fs.readdirSync(R).filter(f => f.endsWith('.app.json'))
  .map(f => ({ ...J(f), _f: f })).sort((a, b) => (a.order || 99) - (b.order || 99));
const BASE = (process.env.URL || site.url || '').replace(/\/$/, '');
const ST = { coming: ['قيد التجهيز', 'wn'], testing: ['قيد الاختبار', 'wn'], published: ['منشور', 'ok'], paused: ['متوقف', 'bd'] };
const NA = 'غير محدد';

// ---- التحقق: يمنع نشر بيانات ناقصة أو مضللة ----
const err = [];
apps.forEach(a => {
  if (!/^[a-z0-9-]+$/.test(a.id || '')) err.push(a._f + ': id غير صالح (أحرف إنجليزية صغيرة وأرقام وشرطة فقط)');
  if (!a.name) err.push(a._f + ': name مطلوب');
  if (!ST[a.status]) err.push(a._f + ': status يجب أن يكون coming أو testing أو published أو paused');
  if (a.apk && (!a.apk.url || !/^[a-f0-9]{64}$/i.test(a.apk.sha256 || ''))) err.push(a._f + ': apk يحتاج url وsha256 صحيحاً (64 خانة)');
  if (a.status === 'published' && !a.play_url && !a.apk) err.push(a._f + ': لا يمكن وسم التطبيق «منشور» بلا play_url أو apk');
});
if (new Set(apps.map(a => a.id)).size !== apps.length) err.push('معرّفات مكررة بين التطبيقات');
if (err.length) { console.error('أخطاء في البيانات:\n- ' + err.join('\n- ')); process.exit(1); }

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LOGO = '<svg viewBox="0 0 48 48" width="30" height="30" aria-hidden="true"><rect width="48" height="48" rx="11" fill="#0a1a44"/><path d="M8 14l7 22 9-14 9 14 7-22" fill="none" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const urls = [];
const write = (rel, html) => { const f = p.join(D, rel); fs.mkdirSync(p.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };

function page(rel, { t, d, b, noindex }) {
  const u = '/' + rel.replace(/index\.html$/, '');
  if (!noindex && rel !== '404.html') urls.push(u);
  const desc = esc(d || site.tagline);
  write(rel, `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t)} | ${esc(site.brand)}</title><meta name="description" content="${desc}">
${noindex ? '<meta name="robots" content="noindex">' : ''}<meta property="og:title" content="${esc(t)}"><meta property="og:description" content="${desc}"><meta property="og:type" content="website">
${BASE ? `<link rel="canonical" href="${BASE + u}"><meta property="og:url" content="${BASE + u}">` : ''}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/style.css">
<script>try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script></head>
<body><header class="top"><a class="brand" href="/">${LOGO}<span>${esc(site.brand)}</span></a>
<nav><a href="/apps/">متجر التطبيقات</a><a href="/privacy/">الخصوصية</a><a href="/support/">الدعم والتواصل</a></nav>
<button id="th" class="ic" type="button" aria-label="تبديل الوضع الداكن والفاتح">◐</button></header>
<main>${b}</main>
<footer><p>© ${new Date().getFullYear()} ${esc(site.brand)} — ${esc(site.center)}</p><p><a href="/apps/">التطبيقات</a><a href="/privacy/">سياسات الخصوصية</a><a href="/support/">الدعم والتواصل</a></p><p>تُعرض حالة كل تطبيق كما هي، ولا يظهر رابط تنزيل إلا عند توفره فعلاً.</p></footer>
<script src="/assets/site.js" defer></script></body></html>`);
}

const ico = a => a.icon ? `<img class="ico" src="${esc(a.icon)}" alt="" width="64" height="64">` : `<span class="ico" aria-hidden="true">${esc([...a.name][0])}</span>`;
const tag = a => `<span class="tag ${ST[a.status][1]}">${ST[a.status][0]}</span>`;
const card = a => `<a class="card app" href="/apps/${a.id}/" data-name="${esc((a.name + ' ' + (a.short || '')).toLowerCase())}" data-cat="${esc(a.category || '')}">${ico(a)}<div><h3>${esc(a.name)}</h3><p>${esc(a.short || 'تفاصيل التطبيق قيد الإعداد.')}</p>${tag(a)}</div></a>`;
const lst = v => Array.isArray(v) && v.length
  ? `<ul>${v.map(x => `<li>${typeof x === 'object' ? `<b>${esc(x.name)}</b>${x.purpose ? ' — ' + esc(x.purpose) : ''}` : esc(x)}</li>`).join('')}</ul>`
  : typeof v === 'string' && v.trim() ? `<p>${esc(v)}</p>`
  : '<p class="note">لم تُحدَّد بعد، ويجب تعبئتها بمعلومات حقيقية قبل اعتماد السياسة.</p>';
const contact = site.email ? `<a href="mailto:${esc(site.email)}">${esc(site.email)}</a> أو ` : '';

// ---- الرئيسية ----
page('index.html', { t: site.center, b: `
<section class="hero"><h1>${esc(site.center)}</h1><p>${esc(site.tagline)}</p>
<p class="row"><a class="btn" href="/apps/">تصفح التطبيقات</a><a class="btn g" href="/support/">الدعم والتواصل</a></p></section>
<h2>التطبيقات</h2><div class="grid">${apps.map(card).join('')}</div>
<section class="box" style="margin-top:20px"><h2 style="margin-top:0">مبدأ الشفافية</h2><p>لا نعرض زر تنزيل أو رابط متجر إلا بعد توفره فعلاً، وتظهر على كل تطبيق حالته الحقيقية.</p></section>` });

// ---- المتجر ----
const cats = [...new Set(apps.map(a => a.category).filter(Boolean))];
page('apps/index.html', { t: 'متجر التطبيقات', d: 'جميع تطبيقات ' + site.brand, b: `
<h1>متجر التطبيقات</h1>
<label for="q">ابحث عن تطبيق</label><input id="q" type="search" placeholder="اسم التطبيق">
${cats.length ? `<div class="chips"><button class="chip on" type="button" data-cat="">الكل</button>${cats.map(c => `<button class="chip" type="button" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
<div class="grid" style="margin-top:12px">${apps.map(card).join('')}</div>
<p id="none" class="note" hidden>لا توجد تطبيقات مطابقة للبحث.</p>` });

// ---- صفحة كل تطبيق + سياسة الخصوصية ----
apps.forEach(a => {
  let dl = '';
  if (a.play_url) dl += `<p><a class="btn" href="${esc(a.play_url)}" rel="noopener">Google Play</a></p>`;
  if (a.apk) dl += `<p><a class="btn g" style="color:var(--ac)" href="${esc(a.apk.url)}" rel="noopener" download>تنزيل APK${a.apk.size ? ' (' + esc(a.apk.size) + ')' : ''}</a></p>
<p class="warn">تحذير: تثبيت ملفات APK من خارج Google Play يتطلب منك الثقة بالمصدر. تحقق من البصمة أدناه قبل التثبيت.</p><p>SHA-256:</p><code>${esc(a.apk.sha256)}</code>`;
  if (!dl) dl = '<p class="note">التنزيل غير متاح حالياً. سيُضاف الرابط هنا عند توفر إصدار فعلي.</p>';
  const row = (k, v) => `<tr><th>${k}</th><td>${v ? esc(v) : NA}</td></tr>`;
  const desc = a.description ? a.description.split(/\n{2,}/).map(x => `<p>${esc(x)}</p>`).join('') : '<p class="note">وصف التطبيق قيد الإعداد وسيُضاف عند اعتماده.</p>';
  const rel = (a.releases || []).length ? `<ul>${a.releases.map(r => `<li><b>${esc(r.version)}</b>${r.date ? ' — ' + esc(r.date) : ''}${r.notes ? '<br>' + esc(r.notes) : ''}</li>`).join('')}</ul>` : '<p class="note">لا توجد إصدارات منشورة بعد.</p>';
  page(`apps/${a.id}/index.html`, { t: a.name, d: a.short || ('صفحة تطبيق ' + a.name), b: `
<p><a href="/apps/">← متجر التطبيقات</a></p>
<div class="head">${ico(a)}<div><h1>${esc(a.name)}</h1>${tag(a)}<p style="margin:4px 0 0;color:var(--mu)">${esc(a.short || '')}</p></div></div>
<div class="card"><h2 style="margin-top:0">التنزيل</h2>${dl}</div>
<h2>عن التطبيق</h2>${desc}
${(a.features || []).length ? `<h2>المميزات</h2><ul>${a.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
${(a.screenshots || []).length ? `<h2>لقطات الشاشة</h2><div class="shots">${a.screenshots.map(s => `<img loading="lazy" src="${esc(s)}" alt="لقطة شاشة من ${esc(a.name)}">`).join('')}</div>` : ''}
<h2>التفاصيل</h2><div class="card"><table>${row('الحالة', ST[a.status][0])}${row('الإصدار', a.version)}${row('آخر تحديث', a.updated)}${row('الحجم', a.size)}${row('أندرويد المطلوب', a.min_android)}${row('التصنيف', a.category)}</table></div>
<h2>سجل الإصدارات</h2>${rel}
<h2>الخصوصية والدعم</h2><p><a href="/privacy/${a.id}/">سياسة الخصوصية لـ ${esc(a.name)}</a> · <a href="/support/">الدعم والتواصل</a></p>` });

  const pr = a.privacy || {};
  page(`privacy/${a.id}/index.html`, { t: 'سياسة الخصوصية — ' + a.name, b: `
<p><a href="/apps/${a.id}/">← ${esc(a.name)}</a></p><h1>سياسة الخصوصية: ${esc(a.name)}</h1>
${pr.approved ? '' : '<p class="warn">هذه الصفحة مسودة لم يُعتمد محتواها بعد، وليست سياسة نهائية. الحقول غير المعبّأة تظهر كما هي حتى تُستكمل بمعلومات حقيقية.</p>'}
<p>آخر تحديث: ${esc(pr.updated || 'لم يُحدَّد بعد')}</p>
<p>توضح هذه الصفحة كيف يتعامل تطبيق ${esc(a.name)} من ${esc(site.brand)} مع بيانات المستخدم.</p>
<h2>البيانات التي يجمعها التطبيق</h2>${lst(pr.data_collected)}
<h2>الأذونات المستخدمة وسبب كل إذن</h2>${lst(pr.permissions)}
<h2>خدمات الطرف الثالث والإعلانات والتحليلات</h2>${lst(pr.third_party)}
<h2>الاحتفاظ بالبيانات</h2>${lst(pr.retention)}
<h2>الأطفال</h2>${lst(pr.children)}
<h2>حذف البيانات وحقوقك</h2>${lst(pr.deletion)}
<h2>التواصل</h2><p>للاستفسار عن الخصوصية: ${contact}<a href="/support/">نموذج الدعم</a>.</p>` });
});

page('privacy/index.html', { t: 'سياسات الخصوصية', b: `<h1>سياسات الخصوصية</h1><p>لكل تطبيق سياسة برابط مستقل.</p><div class="grid">${apps.map(a => `<a class="card app" href="/privacy/${a.id}/">${ico(a)}<div><h3>${esc(a.name)}</h3>${pr0(a)}</div></a>`).join('')}</div>` });
function pr0(a) { return `<span class="tag ${(a.privacy || {}).approved ? 'ok' : 'wn'}">${(a.privacy || {}).approved ? 'معتمدة' : 'مسودة'}</span>`; }

// ---- الدعم والتواصل (نموذج Netlify Forms حقيقي) ----
page('support/index.html', { t: 'الدعم والتواصل', d: 'تواصل مع فريق ' + site.brand, b: `
<h1>الدعم والتواصل</h1>${site.email ? `<p>البريد: <a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>` : ''}
<form class="card" name="support" method="POST" action="/support/thanks/" data-netlify="true" netlify-honeypot="bot-field">
<input type="hidden" name="form-name" value="support"><p hidden><label>لا تملأ هذا الحقل: <input name="bot-field"></label></p>
<label for="n">الاسم</label><input id="n" name="name" required maxlength="80">
<label for="e">البريد الإلكتروني (للرد عليك)</label><input id="e" name="email" type="email" required maxlength="120">
<label for="a">التطبيق</label><select id="a" name="app"><option>الموقع عموماً</option>${apps.map(a => `<option>${esc(a.name)}</option>`).join('')}</select>
<label for="k">نوع الرسالة</label><select id="k" name="type"><option>مشكلة في التطبيق</option><option>اقتراح</option><option>استفسار</option><option>طلب متعلق بالخصوصية أو حذف البيانات</option></select>
<label for="m">الرسالة</label><textarea id="m" name="message" required maxlength="3000"></textarea>
<p style="margin-bottom:0"><button class="btn" type="submit">إرسال</button></p></form>
<h2>أسئلة شائعة</h2>
<details><summary>كيف أبلغ عن مشكلة؟</summary><p>أرسل النموذج أعلاه مع اسم التطبيق ونوع الجهاز وإصدار أندرويد وخطوات تكرار المشكلة.</p></details>
<details><summary>متى يتوفر تنزيل التطبيق؟</summary><p>يظهر زر التنزيل أو رابط Google Play في صفحة التطبيق عند توفره فعلاً. إن لم يظهر فهو غير متاح بعد.</p></details>
<details><summary>كيف أطلب حذف بياناتي؟</summary><p>اختر «طلب متعلق بالخصوصية أو حذف البيانات» في النموذج.</p></details>` });
page('support/thanks/index.html', { t: 'تم الإرسال', noindex: true, b: '<h1>وصلتنا رسالتك</h1><p>شكراً لك. سنراجعها ونرد على بريدك عند الحاجة.</p><p><a class="btn" href="/">العودة للرئيسية</a></p>' });
page('404.html', { t: 'الصفحة غير موجودة', noindex: true, b: '<h1>الصفحة غير موجودة</h1><p>تحقق من الرابط أو عد إلى <a href="/">الصفحة الرئيسية</a> أو <a href="/apps/">المتجر</a>.</p>' });

// ---- ملفات ثابتة و SEO ----
write('robots.txt', `User-agent: *\nAllow: /\n${BASE ? 'Sitemap: ' + BASE + '/sitemap.xml\n' : ''}`);
if (BASE) write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${BASE + u}</loc></url>`).join('\n')}\n</urlset>\n`);
else console.warn('تنبيه: لا يوجد عنوان موقع (URL)، لن يُنشأ sitemap.xml. على Netlify يُضبط تلقائياً.');
['style.css', 'site.js', 'favicon.svg'].forEach(f => { fs.mkdirSync(p.join(D, 'assets'), { recursive: true }); fs.copyFileSync(p.join(R, f), p.join(D, 'assets', f)); });
fs.readdirSync(R).filter(f => /\.(png|jpe?g|webp|svg)$/i.test(f) && f !== 'favicon.svg').forEach(f => { fs.mkdirSync(p.join(D, 'media'), { recursive: true }); fs.copyFileSync(p.join(R, f), p.join(D, 'media', f)); });
console.log(`تم: ${apps.length} تطبيق، ${urls.length} صفحة في dist/`);
