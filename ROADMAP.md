# Дорожная карта (Roadmap)

Краткая сводка статуса
- Основа бекенда и авторизации готова (JWT, RBAC, аудит).
- CRUD по ключевым сущностям, биллинг и платежи — готовы.
- Отчетность: Excel/PDF — готовы (развиваем шаблоны).
- Аналитика (occupancy/monthly/aging) и UI‑дашборд — готовы.
- Резервации — готовы (вкл. автоистечение и кнопку «Истечь сейчас»).


## Технологический стек
- Backend: NestJS 11, TypeScript 5, PostgreSQL 16, Prisma 5.
- Auth: JWT (httpOnly cookie), RBAC (ADMIN, OPERATOR, ANALYST), аудит действий.
- Frontend: React 18 + Vite, React Router, React Query, Ant Design, TypeScript.
- Документация: Swagger UI по /api/docs.

## Что уже сделано
- Backend — базовая архитектура
  - Глобальные настройки: prefix /api/v1, CORS для http://localhost:5173, валидация, Swagger.
  - Prisma schema: пользователи/роли, помещения, арендаторы, договоры, индексации, начисления, счета, платежи, пени, резервации, VAT, аудит.
  - RBAC: JwtAuthGuard + RolesGuard, декораторы `@Public`, `@Roles`.
  - Аудит: модель `AuditLog` + глобальный перехватчик (логирует POST/PUT/PATCH/DELETE).
  - Auth: регистрация/логин/логаут, `auth/me` читает jwt из cookie.
  - Модули и эндпоинты:
    - Premises: CRUD.
    - Tenants: CRUD.
    - Leases: список, создание, обновление, activate/terminate/close, удаление DRAFT.
    - Billing: `POST /billing/run` (начисления + черновики счетов), `GET /billing/invoices`, `GET /billing/accruals`.
    - Payments: список, создание, импорт; автопривязка к счету по номеру; перерасчёт статуса счета.
    - Admin: assign-role (ADMIN), audit (ADMIN), bootstrap (повышение первого пользователя до ADMIN, если админа нет).
    - Reports: Excel (invoices, premises, tenants, payments), PDF счета; CSV‑шаблоны (tenants/premises/payments).
    - Analytics: `GET /analytics/occupancy`, `GET /analytics/monthly`, `GET /analytics/aging`.
    - Reservations: `POST /reservations/expire-now` (принудительное автоистечение).
    - Documents: `GET /documents/contract/:leaseId.pdf`, `GET /documents/act/:invoiceId.pdf` (реквизиты из .env).
- Frontend — MVP
  - Инфраструктура: провайдеры (ConfigProvider RU, React Query, Router), AuthContext, ProtectedRoute, макет (меню, logout).
  - Страницы: Login, Dashboard (occupancy/monthly/aging), Premises (list+create+фильтры), Tenants (list+create+фильтры), Leases (list+create+действия+фильтры), Invoices (период+запуск биллинга+экспорт+фильтры), Payments (list+create+поиск/фильтры, привязка по № счета), Reservations (list+create+cancel+expireNow).
  - Admin UI: Пользователи (назначение ролей), Аудит (просмотр журнала).
  - Карточка договора: вкладки Начисления/Счета/Платежи/Индексации, кнопки «Счет (PDF)» и «Акт (PDF)», «Договор (PDF)».
  - Быстрые улучшения: поиск/фильтры в списках; переход «Подробнее» из договоров.

## Ближайшие шаги (Sprint)
- UI: confirm‑диалоги для опасных действий (удаление, terminate/close), унифицированные уведомления (успех/ошибка).
- Сервер: пагинация и фильтры на уровне API (page, pageSize, search, status, period) для списков.
- Документы: улучшение PDF‑шаблонов (логотип, формат РБ), настройки реквизитов через .env, кнопки «Скачать» в UI.
- Импорт: UI для загрузки CSV (tenants/premises/payments) с валидацией и отчетом об ошибках.

## Бэклог (следующие шаги)
- Дашборд KPI: задолженность (aging), начисления/оплаты по месяцам, occupancy, выручка.
- Резервации: CRUD + автоистечение, интеграция со статусами помещений.
- Дебиторка и пени: расчёт, реестр, ручные операции.
- Документы и шаблоны: договор, счёт, акт — настройки реквизитов организации.
- Импорт/экспорт CSV/Excel: арендаторы, помещения, платежи (bulk), шаблоны.
- Нотификации/фоновые джобы: просрочки, напоминания, автоматический биллинг.
- Безопасность и эксплуатация: rate limiting, headers, аудит ролей, бэкапы БД.
- Тесты: юнит/интеграционные (Nest + Prisma test db), e2e сценарии.
- Производительность: индексы БД, N+1, пагинация/фильтры, кэширование (позже Redis).

## Покрытие API (на текущее состояние)
- Auth: POST /auth/register, POST /auth/login, POST /auth/logout, GET /auth/me.
- Premises: GET/POST/PATCH/DELETE /premises, /premises/:id.
- Tenants: GET/POST/PATCH/DELETE /tenants, /tenants/:id.
- Leases: GET/POST/PATCH/DELETE /leases, /leases/:id, POST /leases/:id/(activate|terminate|close).
- Billing: POST /billing/run, GET /billing/invoices, GET /billing/accruals.
- Payments: GET/POST /payments, POST /payments/import.
- Admin: POST /admin/assign-role (ADMIN), GET /admin/audit (ADMIN), POST /admin/bootstrap.

## Критерии готовности этапов
- MVP учёта: CRUD базовых сущностей, активируемые договоры, биллинг, счета, платежи, защита JWT+RBAC, аудит — ГОТОВО.
- Отчётность: выгрузки Excel + PDF счёт — В ПРОЦЕССЕ.
- Аналитика/KPI: сводные показатели и графики — В БЭКЛОГЕ.
- Админ UI: роли и аудит — В БЭКЛОГЕ.

## Как запускать локально
- Server: .env с DATABASE_URL, npm run start:dev, Swagger: http://localhost:3000/api/docs.
- Client: npm run dev, http://localhost:5173. Авторизация через cookie (sameSite=lax).

## Замечания
- Для биллинга у помещений должны быть `rateType` и `baseRate` (для M2 — также площадь `area`).
- Статусы счетов пересчитываются после поступлений; платеж может быть UNRESOLVED при несовпадении арендатора/счёта.
