# BALI Booking v20

Администраторская система бронирования ночного клуба BALI: ночные смены, мероприятия, столы, гости, история и CRM.

## Что изменено в пересборке
- отдельная вкладка **Сегодня / смена**;
- операционный день корректно проходит через полночь (`21-е 23:00 → 22-е 06:00`);
- дополнительные мероприятия не смешиваются с ночной сменой;
- календарь с квадратными датами и названиями событий;
- схема столов без горизонтального скролла на телефоне;
- защита от повторных нажатий + общий loading overlay;
- клиентская база `CLIENTS`, комментарии `CLIENT_NOTES`, история броней;
- ручной check-in гостя;
- VIP / Blacklist / теги;
- конструктор схем с фоновым изображением и drag&drop столов;
- Google Sheets остаётся редактируемой базой;
- GitHub — единый исходный код для Web, Android, iOS и Windows.

## Структура
`web/` — PWA/admin UI  
`api/` — serverless proxy к Apps Script  
`apps-script/` — backend + Google Sheets  
`android/` — Android app  
`ios/` — iOS Web Clip `.mobileconfig`  
`windows/` — Windows WebView2 app

## Deployment
1. Deploy `apps-script/Code.gs + Index.html` as Web App (`Execute as me`, доступ по ссылке).
2. В Vercel задать `APPS_SCRIPT_URL=<Apps Script /exec>`.
3. Deploy repository to Vercel.
4. После получения production URL заменить `https://bali-booking.vercel.app/admin` в Android, Windows и iOS profile, если Vercel выдал другой домен.

Подробности: `docs/ARCHITECTURE.md` и `docs/DATA_MODEL.md`.
