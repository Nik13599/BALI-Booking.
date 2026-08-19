# Архитектура BALI Booking v20

## Источник истины
Google Sheets остаётся операционной базой. GitHub хранит код, сборки и историю версий, но не является базой броней.

## Платформы
- Web/PWA — единый интерфейс администратора.
- Android — нативная WebView-оболочка над тем же интерфейсом.
- iOS — `.mobileconfig` Web Clip на внешний web-домен; поэтому нет служебной полосы Google Apps Script.
- Windows — WPF/WebView2 приложение.

## Backend
Google Apps Script работает как API над Google Sheets. Внешний web вызывает same-origin `/api/rpc`; Vercel Function проксирует запрос в Apps Script, скрывая служебный Google URL и устраняя CORS-проблемы.

## Ночная смена
Главная сущность — операционный день. Смена `21.08 23:00 → 22.08 06:00` имеет:
- `BUSINESS_DATE=2026-08-21`
- `START_AT=2026-08-21T23:00:00+03:00`
- `END_AT=2026-08-22T06:00:00+03:00`
- `KIND=club_shift`

Все дополнительные события (корпоратив, лото, концерт, private) остаются отдельными EVENTS и могут находиться в том же BUSINESS_DATE.
