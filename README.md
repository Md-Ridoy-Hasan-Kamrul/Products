# Your Products Your Dreams: প্রজেক্ট ওভারভিউ

## এটা কী

বাংলাদেশের জন্য একটি multi-vendor মার্কেটপ্লেস। যেকোনো দোকান (ইলেকট্রনিক্স, ফ্যাশন, ঘরের জিনিস, খাবার, বই...) নিজের প্রোডাক্ট তোলে। ক্রেতা প্রোডাক্ট বেছে **Order Now** চাপলে সরাসরি দোকানের WhatsApp খোলে, অর্ডারের মেসেজ লেখা থাকে। দাম, ডেলিভারি আর পেমেন্ট ক্রেতা-বিক্রেতা চ্যাটে ঠিক করে। প্ল্যাটফর্ম প্রতিটি অর্ডার-ক্লিক রেকর্ড করে vendor-এর কাছ থেকে কমিশন নেয়।

## কারা ব্যবহার করবে

| রোল | কী করে |
| --- | --- |
| ক্রেতা | প্রোডাক্ট খোঁজে, ক্যাটাগরি দেখে, WhatsApp-এ অর্ডার করে। লগইন লাগে না |
| VENDOR | `/vendor/login`-এ নিজে দোকান খোলে বা লগইন করে, Seller Center-এ প্রোডাক্ট তোলে (নাম, ক্যাটাগরি, দাম, ছবি, বিবরণ) |
| ADMIN | `/admin/login`-এ লগইন করে সব vendor, order intent আর পাওনা কমিশন দেখে। Admin অ্যাকাউন্ট `.env` থেকে তৈরি হয়, সাইন-আপ নেই |

## কমিশনের নিয়ম (সবচেয়ে গুরুত্বপূর্ণ অংশ)

- প্রতিটি Order Now ক্লিক একটি **order intent**। এটা append-only ledger-এ লেখা হয়, কখনো বদলায় বা মোছে না।
- Intent-এ ক্লিকের মুহূর্তের দাম আর কমিশন snapshot হয়। পরে vendor দাম বদলালেও পুরোনো হিসাব একই থাকে।
- কমিশন vendor-প্রতি `commissionBps` (basis points)। Standard ১০% (`1000`)। আলাদা চুক্তি থাকলে vendor-এর রেট বদলায়, পুরোনো intent নয়।
- সব টাকা poisha-য় পূর্ণসংখ্যা (`priceMinor`, ১ টাকা = ১০০ poisha)।
- Intent মানে ক্লিক, নিশ্চিত বিক্রি নয়। তাই আসল বিক্রি মেলানোর উপায় (vendor "sold" চিহ্ন দেবে, বা মাসিক statement) পরের ধাপে।

## কীভাবে বানানো হয়েছে

| অংশ | টুল |
| --- | --- |
| Web | Astro + React + Tailwind + TypeScript |
| API | Node + Express + Zod |
| ডেটা | এখন in-memory, পরে PostgreSQL + Prisma |
| Auth | Better Auth (email + password, cookie session)। এখন in-memory, পরে Prisma |

বাইরের সব সার্ভিস একটি "provider"-এর পেছনে। এখন mock চলে, `.env` বদলালেই আসল সার্ভিস। এখন আছে: ছবি (`IMAGE_PROVIDER=mock|cloudinary`)।

## পথ

| ধাপ | কী | অবস্থা |
| --- | --- | --- |
| A · Setup | Astro + React + Tailwind, API, টেস্ট, CI | ✅ |
| B · Storefront + WhatsApp অর্ডার | কমলা banner-সহ হোম, সার্চ, ক্যাটাগরি পেজ, প্রোডাক্ট পেজ, Order Now, Vendor ও Admin ড্যাশবোর্ড | ✅ |
| C · Data + Auth | Better Auth লগইন, vendor নিজে signup ✅। বাকি: PostgreSQL + Prisma, admin approval | চলছে |
| D · Vendor tools | প্রোডাক্ট edit/delete ✅। বাকি: স্টক, একাধিক ছবি, ক্লিক analytics | চলছে |
| E · কমিশন আদায় | মাসিক statement, vendor-এর পেমেন্ট ledger, বকেয়া হলে প্রোডাক্ট লুকানো | |
| F · Hardening | rate limit (ক্লিক spam), নিরাপত্তা, ব্যাকআপ, লোড টেস্ট | |

## ঝুঁকি ও খোলা প্রশ্ন

- ক্লিক-ভিত্তিক কমিশনে vendor আপত্তি করতে পারে ("ক্লিক হয়েছে, বিক্রি হয়নি")। কোন হিসাবে কমিশন নেওয়া হবে, লঞ্চের আগে ঠিক করতে হবে।
- একই ক্রেতা বারবার ক্লিক করলে intent বাড়ে। ধাপ F-এ rate limit ও duplicate বাদ দেওয়া লাগবে।
- vendor সরাসরি ক্রেতার সাথে চ্যাট করে, তাই পরের অর্ডার প্ল্যাটফর্মের বাইরে চলে যেতে পারে।

---

## কোড সেটআপ

দুটি আলাদা অংশ, প্রতিটির নিজস্ব `package.json`।

```text
/                     Web: Astro + React + Tailwind + TypeScript
├── src/
│   ├── pages/
│   │   ├── index.astro               Banner, ক্যাটাগরি টাইল, ক্যাটাগরি অনুযায়ী প্রোডাক্ট
│   │   ├── products/[id].astro       প্রোডাক্ট পেজ (WhatsApp মেসেজের Product_URL)
│   │   ├── categories/[slug].astro   একটি ক্যাটাগরির সব প্রোডাক্ট
│   │   ├── search.astro              সার্চ ফলাফল (?q=)
│   │   ├── vendor/login.astro        Vendor লগইন + "Become a seller"
│   │   ├── vendor/dashboard.astro    <VendorDashboard client:only="react" />
│   │   ├── admin/login.astro         Admin লগইন
│   │   └── admin/dashboard.astro     <AdminDashboard client:only="react" />
│   ├── layouts/          BaseLayout.astro (দোকান: Header + Footer), AppLayout.astro (ড্যাশবোর্ড), AuthLayout.astro (লগইন)
│   ├── components/
│   │   ├── layout/       Header.astro (সার্চ বার, ক্যাটাগরি nav), Footer.astro, Logo.astro
│   │   ├── home/         Hero.astro, TrustStrip.astro, CategoryTiles.astro
│   │   ├── catalog/      Catalog.astro
│   │   ├── products/     ProductCard, ProductGrid, OrderNowButton, ProductImage, WhatsAppIcon
│   │   ├── search/       SearchResults.tsx
│   │   ├── auth/         LoginForm.tsx, VendorAccess.tsx
│   │   └── dashboards/   VendorDashboard.tsx (Overview, Products, Order intents, Shop & billing), AdminDashboard.tsx (Overview, Vendors, Products, Order intents), ActivityChart.tsx, IntentTable.tsx, ProductEditor.tsx, ui.tsx (লগইন চেক, sidebar shell, sort/search/filter, কার্ড)
│   ├── lib/              api.ts, auth.ts, whatsapp.ts, categories.ts, format.ts, types.ts
│   └── styles/global.css কমলা brand, Order Now সবুজ
├── scripts/dev.mjs   Web + API একসাথে চালায়
├── e2e/              Playwright (নিজস্ব API :4100 + web :4421 চালায়)
└── api/              API: Node + Express + Zod
    ├── src/
    │   ├── app.ts        Express app, CORS, JSON, 404, error handler
    │   ├── env.ts        Zod দিয়ে .env যাচাই
    │   ├── auth.ts       Better Auth, requireVendor / requireAdmin
    │   ├── store/        in-memory store, seed, commission
    │   ├── providers/images/  mock | cloudinary
    │   └── routes/       health, catalog, orders, vendor, admin, uploads
    └── .env.example
```

ক্যাটাগরির তালিকা দুই জায়গায় আছে: `api/src/store/types.ts` (যাচাই) আর `src/lib/categories.ts` (দেখানোর নাম)। নতুন ক্যাটাগরি দিলে দুটোতেই যোগ করুন।

## WhatsApp অর্ডার ফ্লো

1. "Order Now" একটি আসল লিংক: `https://wa.me/{vendor_phone}?text=Hi, I want to order this: {title} - {product_url}`। JS লোড না হলেও কাজ করে, popup blocker আটকায় না।
2. ক্লিকে `POST /api/orders/click` (`keepalive`) একটি order intent লেখে।
3. Admin ড্যাশবোর্ড vendor-প্রতি intent সংখ্যা ও পাওনা কমিশন দেখায়, vendor নিজের Seller Center-এ নিজের intent আর কমিশন দেখে। দুই ড্যাশবোর্ডেই টেবিল CSV-তে export করা যায়।

| Endpoint | কাজ |
| --- | --- |
| `GET /api/products?q=&category=` | ক্যাটালগ (vendor-এর নাম ও ফোনসহ), ঐচ্ছিক সার্চ/ফিল্টার |
| `GET /api/products/:id` | একটি প্রোডাক্ট |
| `GET /api/categories` | ক্যাটাগরি |
| `POST /api/orders/click` | `{ productId }` → order intent |
| `POST /api/auth/sign-in/email`, `POST /api/auth/sign-out`, `GET /api/auth/get-session` | Better Auth লগইন (cookie) |
| `POST /api/vendor/register` | `{ shopName, phone, email, password }` → নতুন দোকান + vendor লগইন |
| `GET /api/vendor/me`, `GET/POST /api/vendor/products` | vendor লগইন লাগে |
| `GET /api/vendor/insights` | vendor লগইন লাগে। শুধু নিজের intent: মোট, ১৪ দিনের দৈনিক হিসাব, প্রোডাক্ট-প্রতি সংখ্যা, শেষ ১০০টি intent |
| `PATCH/DELETE /api/vendor/products/:id` | শুধু নিজের প্রোডাক্ট edit/delete। Delete মানে লুকানো (soft delete), পুরোনো order intent-এ নাম থেকে যায় |
| `POST /api/uploads` | vendor লগইন লাগে। `{ dataUrl }` (PNG/JPEG/WebP, ≤২ MB) → `{ url }` |
| `GET /api/admin/summary` | admin লগইন লাগে। মোট, vendor-প্রতি কমিশন, ১৪ দিনের দৈনিক হিসাব, প্রোডাক্ট-প্রতি সংখ্যা, শেষ ১০০টি intent (vendor নামসহ) |

## লগইন

| রোল | পেজ | লোকাল অ্যাকাউন্ট |
| --- | --- | --- |
| Admin | `/admin/login` | `admin@ypyd.local` / `admin12345` (`api/.env`-এর `ADMIN_EMAIL`, `ADMIN_PASSWORD`) |
| Vendor | `/vendor/login` | `gadget@ypyd.local`, `deshi@ypyd.local`, `ghor@ypyd.local` / `vendor12345` |

- Demo vendor অ্যাকাউন্ট শুধু dev-এ তৈরি হয়, production-এ নয়। নতুন vendor "Become a seller" ট্যাবে নিজে দোকান খুলতে পারে।
- Production-এ `BETTER_AUTH_SECRET` (৩২+ অক্ষর) আর আলাদা `ADMIN_PASSWORD` না দিলে API চালুই হয় না।
- Web আর API একই host-এ (যেমন `localhost:4321` আর `localhost:4000`) থাকলে session cookie দুই দিকেই কাজ করে। আলাদা domain-এ deploy করলে cookie সেটিং বদলাতে হবে।

এখনকার সীমাবদ্ধতা:
- ডেটা আর লগইন in-memory, API restart দিলে নতুন প্রোডাক্ট, intent, নতুন vendor অ্যাকাউন্ট আর session মুছে যায় (ধাপ C-তে Prisma)।
- সাইট স্ট্যাটিক, তাই vendor-এর নতুন প্রোডাক্ট পরের build-এ দেখা যায়। dev-এ সঙ্গে সঙ্গে আসে।
- নতুন vendor সাথে সাথে বিক্রি শুরু করতে পারে। Admin approval ধাপ C-তে।

## কমান্ড

| কমান্ড | কাজ |
| --- | --- |
| `npm install` | Web dependencies |
| `npm --prefix api install` | API dependencies |
| `npm run dev` | Web + API একসাথে চালু, `localhost:4321` ব্রাউজারে খোলে |
| `npm run dev:web` | শুধু Web |
| `npm run dev:api` | শুধু API, `localhost:4000/health` |
| `npm run build` | Web স্ট্যাটিক build, `dist/` |
| `npm test` | Web Vitest |
| `npm run test:api` | API Vitest |
| `npm run test:e2e` | Playwright |

API চালানোর আগে `api/.env.example` কপি করে `api/.env` বানান (না বানালেও ডিফল্টে চলে, উপরের লোকাল অ্যাকাউন্ট দিয়ে)। Web-এর API ঠিকানা বদলাতে রুটের `.env.example` কপি করে `.env` (`PUBLIC_API_URL`)। `npm run build`-এর সময় API চালু থাকতে হবে, না থাকলে build সফল হয় কিন্তু দোকান খালি দেখায়।
# Products
