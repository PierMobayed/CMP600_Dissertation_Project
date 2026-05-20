# Folder and document review for developer
_Exported on 5/15/2026 at 15:41:44 GMT+1 from Cursor (3.3.27)_

---

**User**

провери папката CMP600_Dissertation_Project и kakvi_dokumenti_da_predadesh_na_DEVELOPER.docx

---

**Cursor**

Преглеждам папката и съдържанието на документа.



Ето обобщение след проверка на папката и извличане на текст от `.docx` (кирилицата в конзолата се чупи, но английските части и структурата са ясни).

## Папка `CMP600_Dissertation_Project`

**Корен**

| Тип | Съдържание |
|-----|------------|
| **Подпапки** | `Documentation`, `Source_Code`, `Tests`, `Viva` |
| **.docx в корена** | `Developer Checklist,Code Review Criteria.docx`, `Developer Implementation Plan.docx`, `for Trello.docx`, `kakvi_dokumenti_da_predadesh_na_DEVELOPER.docx`, `plan.docx`, `PROJECT ROOT.docx` |

**`Documentation/`**

- `API_Contract_v1.docx`
- `Architecture Document.docx`
- `Dissertation_Main_Document.docx`
- `Evaluation_Plan_v1.docx`
- `Requirements Document.docx`

**`Viva/`**

- `Viva_Presentation.docx`
- `Viva_Presentation.pptx`

**`Source_Code/` и `Tests/`** – при преглед няма отчетени файлове (вероятно празни или само папки).

---

## `kakvi_dokumenti_da_predadesh_na_DEVELOPER.docx`

Това е **наръчник какво да дадеш на developer-а**, групиран по приоритет:

**GROUP 1 – задължително (MUST READ)**  
1. Requirements (в документа се цитира `Requirements_Document_v1.docx`)  
2. Architecture (`Architecture_Document_v1.docx`)  
3. `API_Contract_v1.docx`  
4. **Developer Implementation Plan**  
5. **Developer Checklist**  
6. **Code Review Criteria**  

Текстът подчертава: *„You must read these before starting any development.“* и за всеки блок има кратко **какво покрива** (WHAT/HOW, договор за API, фази, DoD, критерии за reject и т.н.).

**GROUP 2 – контекст**  
7. Dissertation Proposal / Expanded Proposal  
8. `Evaluation_Plan_v1.docx` (измервания, logging, hooks за evaluation)

**GROUP 3 – по избор за dev**  
- `Dissertation_Main_Document.docx`, Viva шаблон – основно за контекст, не за директно писане от dev.

В края има **обобщаващ списък** (Documents you must read / Reference documents), теми за **Viva** (*Why architecture / usability / what learned*), **ethics/plagiarism**, и правило, че **developer не пише дисертацията директно**, а доставя **implementation notes**, screenshots, обяснения – включително път `Documentation/Implementation_Notes_DEV.md` (в папката такъв файл **не** се вижда засега; може да го създадеш по-късно).

---

## Несъответствия с имената в папката

В ръководството се ползват имена като `Requirements_Document_v1.docx` и `Architecture_Document_v1.docx`, а в `Documentation/` реално са **`Requirements Document.docx`** и **`Architecture Document.docx`**. За избягване на объркване е добре или да **преименуваш** файловете, или да **актуализираш** `kakvi_dokumenti_da_predadesh_na_DEVELOPER.docx`, за да съвпадат имената 1:1.

Ако искаш, мога да предложа конкретен списък „дай на developer само тези X файла“ с точните пътища от твоя диск.

---

**User**

можеш ли да направиш проекта?

---

**Cursor**

Преглеждам изискванията и архитектурата в документацията, за да имплементираме проекта според спецификацията.



Имплементираме пълния прототип според Requirements, Architecture и API Contract: FastAPI backend + три React (Vite) приложения с карти.



Създаваме backend модулите и след това трите фронтенда.



Създаваме трите React (Vite) приложения.



Премахвам невалидния бутон за статус в driver app и добавям README, тест и корекции по build скриптовете.



Коригиране на тестовете: `TestClient` трябва да се използва като context manager, за да се изпълни startup/lifespan и да се създадат таблиците.



Да — имплементирах работещ прототип според **Requirements**, **Architecture** и **API Contract**. Ето какво има и как се пуска.

## Какво е създадено

### Backend — `Source_Code/backend`
- **FastAPI** + **SQLite** (`backend/data/logistics.db`), всички маршрути под **`/api/v1`** (клиентски поръчки, проследяване, шофьорски задачи, маршрут 2D, локация, статус, dashboard KPI + карта, филтър по статус, симулации).
- **`POST /api/v1/auth/login`** за демо акаунти (не е в краткия API summary, но улеснява трите приложения).
- **Симулация:** `POST /simulation/gps/start` (1 Hz по полилиния), `POST /simulation/status/start` (подобряване на статусите по пайплайн).
- Заглавка **`X-Response-Time-Ms`** за оценка на производителност.
- **pytest** тестове: `backend/tests/test_smoke.py` (4 теста; използва се `TestClient` като context manager).

### Frontends (React + Vite + Leaflet)
| Папка | Порт | Роля |
|--------|------|------|
| `Source_Code/dashboard` | 5173 | KPI, карта (шофьори/пратки), филтър, скорошни събития, бутони за симулация |
| `Source_Code/client_app` | 5174 | Поръчки, проследяване + ETA + мини-карта |
| `Source_Code/driver_app` | 5175 | Задачи, 2D маршрут, 1 Hz GPS към API, бутони за статус |

### Документация
- **`Source_Code/README.md`** — стартиране, портове, акаунти, тестове, cloud кратко.
- **`Documentation/Implementation_Notes_DEV.md`** — бележки за Chapter 5.
- **`Tests/performance/README.md`** — къде са тестовете/латентността.

## Как да го стартираш

1. **API:** от `Source_Code/backend` — `pip install -r requirements.txt` после `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`.
2. **UI:** във всяка от трите папки — `npm install` и `npm run dev` (портовете са в таблицата).
3. **Токен (прототип):** `cmp600-demo-token` (логинът го записва в `localStorage`).

**Демо акаунти:** `client1` / `demo`, `driver1` / `demo`, **`admin` / `demo`** (dashboard).

Трите frontends са **`npm run build`-нати успешно** в тази среда; backend тестовете минават с **`python -m pytest tests -q`** от `backend`.

Ако искаш следваща стъпка: deploy на Render/Railway (един `Dockerfile` или build command) и един общ `.env` с `VITE_API_URL` към облачния URL — кажи и ще го оформим в репото.

---

**User**

1.направи batch файл от който да мога лесно да стартирам и спирам сървара .
2.опиши тази стъпка в файл : deploy на Render/Railway (един Dockerfile или build command) и един общ .env с VITE_API_URL към облачния URL.
ще направим нов файл опиши тази ступка вътре после ще направим нов github repo и него ще го вържем за Railway. 
3. направи и документация за да мога да попълвам десертацията си 

---

**Cursor**

Създаваме batch контрол за backend, файл за cloud deploy (с Dockerfile и `.env`), и ръководство за попълване на дисертацията.



Опростяване на командата за стартиране в batch файла (кавичките с пътища с интервали).



Ето какво е добавено и къде да го намериш.

## 1. Batch контрол на сървъра

**Файл:** `CMP600_Dissertation_Project\server-control.bat` (на същото ниво като папката `Source_Code`).

- **[1] Start backend** — отваря нов прозорец, `cd` към `Source_Code\backend`, инсталира зависимости (`pip install -r requirements.txt`), пуска `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`.
- **[2] Stop backend** — спира процеса, който слуша на **порт 8000** (чрез PowerShell `Get-NetTCPConnection`).
- **[3] Open API docs** — отваря `http://127.0.0.1:8000/docs`.
- **[0] Exit**

Стартирай `.bat` файла с двоен клик от `CMP600_Dissertation_Project` или от там в командния ред.

## 2. Deploy (Railway / Render) + `.env`

| Файл | Съдържание |
|------|------------|
| **`Documentation/Cloud_Deploy_Railway_Render.md`** | Стъпки: GitHub → Railway, root directory, Dockerfile **или** build/start команди, променливи `PORT` / `DATABASE_URL`, пълен **`VITE_API_URL`** с `/api/v1`, билд на трите Vite приложения, алтернатива Render, checklist пред Viva. |
| **`Source_Code/backend/Dockerfile`** | Минимален Docker image за backend (`uvicorn` на `$PORT`). |
| **`Source_Code/.env.example`** | Шаблон с **`VITE_API_URL`** (локален и cloud пример); копирай като `.env` / `.env.local` **във всяко** от `dashboard`, `client_app`, `driver_app` преди `npm run build` (Vite чете env от папката на приложението). |

## 3. Документация за дисертацията

**Файл:** **`Documentation/Dissertation_Population_Guide.md`** (на български) — карта на главите, връзка с Requirements / Architecture / API / Evaluation, какви **скрийншоти и цифри** да събереш, ethics, ограничения на прототипа, checklist преди подаване.

По-ранното **`Documentation/Implementation_Notes_DEV.md`** остава за технически bullet-и към Chapter 5.

**Обновен е** `Source_Code/README.md` с препратка към `server-control.bat` и към двата нови guide-а.

Когато създадеш GitHub repo, качи целия `CMP600_Dissertation_Project` (или поне `Source_Code` + `Documentation` + `server-control.bat`), после в Railway задай root **`Source_Code/backend`** и използвай **`Cloud_Deploy_Railway_Render.md`** като чеклист.

---

**User**

добре сега http://127.0.0.1:8000/docs#/  това видях че работи , ами другите работят ли и как 

---

**Cursor**

Да — **другите три части са отделни уеб приложения** (React + Vite). Те не се пускат сами с backend-а: трябва **API на порт 8000** + **в три терминала** `npm run dev` за всяко приложение.

## Как работи връзката

- Браузърът зарежда UI от **Vite** (`localhost:5173` / `5174` / `5175`).
- Приложенията викат **`http://127.0.0.1:8000/api/v1/...`** (същият адрес като в Swagger, но под `/api/v1`).
- След **логин** в localStorage се пази токенът `cmp600-demo-token` и заявките имат header `Authorization: Bearer ...`.

Ако **само** `/docs` работи, но фронтендите показват грешки — почти винаги е защото **не е пуснат** backend на 8000 или не си направил `npm install` в съответната папка.

## Как да ги пуснеш (локално)

**Стъпка 1** — backend (вече го имаш): `http://127.0.0.1:8000/docs`.

**Стъпка 2** — отделен терминал за всяко приложение:

```powershell
cd "…\CMP600_Dissertation_Project\Source_Code\dashboard"
npm install
npm run dev
```

→ отвори **http://127.0.0.1:5173** — *Office dashboard.* Логин: **admin** / **demo**. Бутоните за симулация викат API.

```powershell
cd "…\CMP600_Dissertation_Project\Source_Code\client_app"
npm install
npm run dev
```

→ **http://127.0.0.1:5174** — *Клиент.* Логин: **client1** / **demo** → списък поръчки, избери ред → проследяване + карта.

```powershell
cd "…\CMP600_Dissertation_Project\Source_Code\driver_app"
npm install
npm run dev
```

→ **http://127.0.0.1:5175** — *Шофьор.* Логин: **driver1** / **demo** → задачи, 2D маршрут, опционално включване на “GPS updates” (1 заявка/сек към API).

## Бърза проверка без фронтенд

В Swagger (`/docs`) можеш да пробваш напр. `GET /api/v1/dashboard/overview` с **Authorize** и токен `cmp600-demo-token` — ако това минава, API е наред; фронтендите просто правят същото през JavaScript.

## Обобщение

| Какво | URL | Кой влиза |
|--------|-----|------------|
| API / Swagger | http://127.0.0.1:8000/docs | — |
| Dashboard | http://127.0.0.1:5173 | admin / demo |
| Client | http://127.0.0.1:5174 | client1 / demo |
| Driver | http://127.0.0.1:5175 | driver1 / demo |

Ако искаш всичко от един `.bat`, мога да добавя в `server-control.bat` опции „старт на dashboard/client/driver в нови прозорци“ (ако ти трябва да не пускаш ръчно три терминала).

---

**User**

да добави всичко от един .bat

---

**Cursor**

Разширяваме `server-control.bat` с „Стартирай всичко“, „Спри всичко“, отделни стартове за всяко приложение и отваряне на всички URL-и.



Поправям спирането на процесите: подпрограмата за портове не подава правилно аргументите към PowerShell.



Ето какво е направено.

## Обновен `server-control.bat`

От папката **`CMP600_Dissertation_Project`** (където е `.bat` файлът):

| Опция | Действие |
|--------|----------|
| **[1] Start ALL** | Отваря **4 прозореца**: API (8000), Dashboard (5173), Client (5174), Driver (5175). Първо пуска Python/uvicorn, след ~3 s и трите Vite-а с `npm install` (първият път може да отнеме малко) + `npm run dev`. |
| **[2] Stop ALL** | Спира процесите, които слушат на **8000, 5173, 5174, 5175**. |
| **[3]** | Само API (8000). |
| **[4]–[6]** | Само Dashboard / Client / Driver. |
| **[7]** | Спира само API (8000). |
| **[8]** | Спира само трите фронтенда (5173–5175). |
| **[9]** | Отваря в браузър: `/docs`, `5173`, `5174`, `5175`. |
| **[0]** | Изход. |

Логините са същите: **admin/demo**, **client1/demo**, **driver1/demo** за съответните адреси.

`Source_Code/README.md` е допълнен с това меню.

**Забележка:** Node/npm трябва да са в PATH (както при нормален `npm` от терминал). Ако някой прозорец пише че няма `npm`, инсталирай Node LTS и пусни отново **[1]**.

---

**User**

добре всичко стартира . сега какво е направено и какво още трябва да се направи по самите апове че да отговарят на всички изисквания 

---

**Cursor**

Ето сглобена картина спрямо **Requirements** и **API Contract** (от имплементацията в репото — без да отварям всеки файл наново).

## Backend (API + данни)

| Изискване | Статус |
|-----------|--------|
| FR-BE-01: модел с поръчки/пратки, клиенти, шофьори, локации, статуси | **Направено** (SQLite + seed данни). |
| FR-BE-02: клиентски API — поръчки, проследяване | **Направено** (`/clients/.../orders`, `/shipments/.../tracking`). |
| FR-BE-03: шофьорски API — задачи, маршрут, локация | **Направено** (`/drivers/.../jobs`, `/shipments/.../route`, `POST .../location`). |
| FR-BE-04: dashboard — aggregate + карта | **Направено** (`/dashboard/overview`, `/dashboard/map`, филтър `.../shipments?status=`). |
| FR-BE-05: симулация GPS + статуси | **Направено** (`POST /simulation/gps/start`, `POST /simulation/status/start` + фонови задачи). |
| API Contract — всички описани REST пътища | **Покрити** (+ `POST /auth/login` за прототип, `GET /dashboard/recent-events` за timeline). |
| Регистрация на нов клиент (FR-CL-01 „създаване на акаунт“) | **Частично** — има вход и фиктивни потребители от seed; **няма** отделен `POST /register` и UI „Регистрация“. За MVP често се приема като изключение с изречение в дисертацията. |

---

## Client app

| Изискване | Статус |
|-----------|--------|
| FR-CL-01: вход (прототип) | **Направено** (`client1` / `demo`). |
| FR-CL-02: списък поръчки | **Направено**. |
| FR-CL-03: статус, позиция, ETA | **Направено** (карта + polling ~3 s). |
| FR-CL-04: симулирани данни | **Направено**. |
| „Регистрация“ като отделен екран | **Липсва** (по желание: един прост форм или само текст в дисертация „извън обхват на MVP“). |

---

## Office dashboard

| Изискване | Статус |
|-----------|--------|
| FR-DB-01: 2D карта — пратки и шофьори | **Направено**. |
| FR-DB-02: KPI (total, delivered, delayed, in transit) | **Направено**. |
| FR-DB-03: филтри — шофьор, статус, дата на доставка | **Частично** — има филтър по **статус**; **няма** UI филтър по шофьор или по дата (данните в модела са ограничени—ETA като текст, не пълен календарен филтър). |
| FR-DB-04: timeline / събития, „алерти“ забавени | **Частично** — има **recent events**; **няма** отделен панел „alerts“ само за Delayed (може да се добави като подсекция или филтър). |

---

## Driver app

| Изискване | Статус |
|-----------|--------|
| FR-DR-01: списък задачи | **Направено**. |
| FR-DR-02: 2D маршрут; 3D по желание | **2D направено**; **3D не е имплементирано** (опционално по спека). |
| FR-DR-03: автоматични позиционни обновявания | **Направено** под формата на превключвател **„GPS updates“** (~1 Hz към API, не е винаги включен при старт — това е умишлено за демо). |
| FR-DR-04: обновяване на етапи/статус | **Направено** (бутони към валидни статуси от договора). |

---

## Нефункционални (NFR)

| Изискване | Статус |
|-----------|--------|
| P95 latency &lt; 300 ms | **Не е доказано** — има заглавка `X-Response-Time-Ms`, но **няма** описан натоварващ тест / таблица с P95 в репото. |
| Карта &lt; 1 s при симулирани данни | **Не е формално измерено** (за дисертация: няколко скрийншота + числа). |
| 1 Hz локации | **Имплементирано** в driver симулацията (и backend симулатор). |
| Базова автентикация, без реални ПД | **Прототип** — Bearer + login; **подходи за дисертацията**. |

---

## Какво има смисъл да „донаправиш“, ако искаш плътно покритие

1. **Dashboard:** филтър по **driverId** и/или по **дата** (ако добавиш поле „delivery date“ в модела или парсваш ETA). Малък panel „Delayed alerts“ при статус `Delayed`.  
2. **Client:** екран/бутон **„Регистрация“** (фиктивен `POST` + запис в SQLite) **или** изрично в текста на дисертацията „регистрация извън MVP“.  
3. **Оценка (NFR):** един кратък скрипт или Postman runner + таблица P95; за картата — наблюдение/таймер.  
4. **3D маршрут:** само ако искаш stretch goal (напр. Mapbox GL) — не е задължително по спека.  
5. **Dissertation:** heuristic / SUS и ethics — **не са в кода**, а в **Evaluation** глава и приложения.

Ако кажеш кой ред имаш предвид първи (филтри в dashboard vs. регистрация в client), мога да предложа конкретни промени по файлове в репото стъпка по стъпка.

---

**User**

направи ги всичките от 1 до 5 .


---

**Cursor**

Имплементираме петте точки: преглеждам текущия код и го разширявам систематично.



Имплементираме петте точки: първо backend (модел, миграция, нови endpoints), след това UI и скриптове.



Премествам `_err` преди `register`, за да няма объркване.



Пиша обновения dashboard, client и driver.



Ето какво е **направено** по петте точки и как се ползва.

---

### 1) Dashboard — филтри + „Delayed alerts“
- **Филтри:** статус, **шофьор** (списък от API), **дата на доставка** (`delivery_date`, поле `type="date"`).
- **Карта:** при активен филтър се показват само пратки от `/dashboard/shipments?...`; шофьорите се ограничават при избран driver.
- **Панел „Delayed alerts“:** данни от `GET /api/v1/dashboard/alerts/delayed`.
- **Време за опресняване:** под заглавието се показва **„Data refresh … ms“** (цялата партида заявки за този цикъл).

**Backend:** `delivery_date` в таблица `shipments` (+ **миграция** `sqlite_migrate.py` за стари `.db`), `GET /dashboard/drivers`, разширен `GET /dashboard/shipments` с `driverId` и `deliveryDate`.

---

### 2) Client — регистрация
- **`POST /api/v1/auth/register`** — създава нов клиент `Cxxx`, връща същия прототипен токен.
- В UI: на екрана за вход → линк **„Register (prototype)“**, форма username/password (+ опционално име).

---

### 3) NFR — латентност + карта
- Скрипт **`Tests/performance/latency_check.py`** — средно, p50/p95/p99 (променливи `API_BASE`, `N`, `PATH_TO_TEST`).
- Числото **„Data refresh … ms“** на dashboard служи за обсъждане на времето до готови данни за картата/KPI.

---

### 4) 3D маршрут (stretch)
- **`GET /api/v1/shipments/{id}/route?dimensions=3`** — връща `coordinates3D` с **`altMeters`** (симулирана височина).
- **Driver app:** 2D Leaflet + блок **3D-style** (MapLibre наклон + лента с височини); превключвател **„Show 3D / elevation strip“**. GPS остава по **2D** полилинията (1 Hz).

Нов файл: `Source_Code/driver_app/src/RouteMap3D.tsx` (+ зависимости `maplibre-gl`, `react-map-gl`).

---

### 5) Документация за оценка / етика
- **`Documentation/Evaluation_Heuristics_SUS_Ethics.md`** — шаблон за heuristics, по избор SUS, етика, performance таблица; връзка към латентност скрипта.
- Обновени: **`Tests/performance/README.md`**, **`Implementation_Notes_DEV.md`**.

---

**Важно:** при първо стартиране след промяната базата се мигрира автоматично. Ако някой път видиш странни данни, спри API-то и изтрий `Source_Code/backend/data/logistics.db`, после пусни отново (ще се пресее).

**Инсталация на driver след `git pull`:** в `driver_app` пак **`npm install`** (нови пакети). Всички три фронтенда и backend тествах в тази среда — **pytest минава**, **build** на dashboard, client и driver е успешен.

---

**User**


up to date in 1s

> cmp600-driver@1.0.0 dev
> vite

error when starting dev server:
Error: EPERM: operation not permitted, rmdir 'C:\Users\PierM\OneDrive - Planet Education Networks\Study\year3\(NCG Comp 1.5) Dissertation\Assessment\CMP600_Dissertation_Project\Source_Code\driver_app\node_modules\.vite\deps'

C:\Users\PierM\OneDrive - Planet Education Networks\Study\year3\(NCG Comp 1.5) Dissertation\Assessment\CMP600_Dissertation_Project\Source_Code\driver_app>

---

**Cursor**

Типичен проблем на Windows (често с OneDrive/антивирус): процес държи файлове в `node_modules/.vite` или Vite не може да изтрие кеша. Преместваме Vite кеша извън `node_modules` и добавяме `.vite` към `.gitignore`.



Ето какво означава грешката и какво промених в проекта.

## Причина
На Windows **Vite** при старт често изтрива/презаписва кеша под `node_modules\.vite\deps`. Ако папката е в **OneDrive**, или **друг процес** (втори `npm run dev`, antivirus, Cursor) държи файлове, `rmdir` връща **`EPERM: operation not permitted`**.

## Какво направих в кода
- В **трите** `vite.config.ts` (dashboard, client, driver) е зададено **`cacheDir: ".vite"`** — кешът вече е в `driver_app\.vite`, не в `node_modules\.vite`, което обикновено спира този проблем.
- Добавен е **`server.watch.usePolling: true`** — по-стабилно при синхронизирани папки (OneDrive).
- В **`Source_Code/.gitignore`** е добавено **`**/.vite/`**.
- В **`Source_Code/README.md`** има кратък раздел за тази грешка.

## Какво да направиш веднъж на машината си
1. Спри всички **`npm run dev`** за това приложение (и затвори излишни терминали).
2. В PowerShell, в папката на **driver**:

```powershell
cd "C:\Users\PierM\OneDrive - Planet Education Networks\Study\year3\(NCG Comp 1.5) Dissertation\Assessment\CMP600_Dissertation_Project\Source_Code\driver_app"
Remove-Item -Recurse -Force .\node_modules\.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\.vite -ErrorAction SilentlyContinue
npm run dev
```

Ако пак дава **EPERM**, паузирай синхронизацията на OneDrive за тази папка или копирай проекта извън OneDrive (напр. `C:\dev\CMP600_...`) и работи оттам — това е най-сигурното дългосрочно решение.

След моите промени новият кеш ще е **`driver_app\.vite`**; старият проблемен път **`node_modules\.vite`** може просто да се изтрие ръчно, както по-горе.

---

**User**

добре тръгна сеа да го направим по работещо . клиента трябва да може да прави поръчки за пратки , офиса да ги виждат и да ги преразпределят към шофйори . предложи други опции за доставки на пратки 

---

**Cursor**

Имплементираме създаване на пратки от клиент, офис-преглед и назначаване на шофьор, поле за тип доставка и кратко подобрование на UX.



Добавяме създаване на пратки от клиент, назначаване/преразпределение от офис и опции за тип доставка.



Добавяме логиката в `main.py` и актуализираме клиентското и офис приложението.



Ето какво е добавено и как работи **end-to-end**, плюс идеи за още опции.

## Имплементирано в системата

### Клиент
- Форма **„Нова поръчка / пратка“**: адрес, **тип доставка** (от каталог), по избор дата и координати.
- Извиква се **`POST /api/v1/clients/{clientId}/shipments`** → нова пратка с **`Created`**, **`driver_id = null`**, стартова позиция от **хъб** (сорт център за картата).
- Таблицата „Orders“ показва още **destination**, **service**, **driver**.

### Офис (dashboard)
- Секция **„Операции — разпределение към шофьори“**: всички пратки или само **`Само пратки без шофьор`** (`GET .../dashboard/shipments?unassigned=true`).
- На ред: избор на шофьор + **OK** → **`POST /api/v1/dashboard/shipments/{id}/assign`** с `{ "driverId": "..." }`.
- При **`Created`** статусът става **`Assigned`**; при вече назначена пратка може **повторно назначение** (**преразпределение**), освен ако е **`Delivered`**.

### API / данни
- **`GET /api/v1/meta/delivery-options`** — публичен каталог за падащи менюта.
- Колона **`delivery_option`** в **`shipments`** (+ миграция в **`sqlite_migrate.py`**).

### Файлове с логика
- `backend/app/delivery_options.py` — етикети и описания (част са на български за UI).
- Клиент: `createClientShipment`, `getDeliveryOptionsPublic` в `client_app/src/api.ts`.
- Обновени: `backend/app/main.py`, `models.py`, `seed.py`, `dashboard/src/App.tsx`, `client_app/src/App.tsx`, стилове.

Ако има **стара база без колоната `delivery_option`**, при следващо стартиране на API миграцията я добавя. При странни състояния все още помага триене на `backend/data/logistics.db` за чист seed.

---

## Други опции за доставка (за продукт/дисертация — не са задължително код)

Освен вече имплементираните **Standard, Express, SameDay, PickupPoint, ScheduledWindow, TemperatureControlled, WhiteGlove**, реални продукти често добавят:

| Опция | Смисъл |
|--------|--------|
| **Междумодална** | Път + влак + „last mile“ с един етикет. |
| **Green / low-emission** | Маршрутизация по CO₂, електро флота. |
| **Crowdsourcing / P2P** | „Съседад ти носи“, Uber-style динамика. |
| **PUDO / партньорска мрежа** | Интеграция с UPS/DPD locker API (тук само симулация). |
| **Dangerous goods** | ADR клас, ограничения за транспорт. |
| **Код + подпис при връчване** | Proof of delivery (снимка/PIN) — етично документирани като simulation. |

Тези могат да се опишат в **Разширени цели / Future work**, без всичко да се кодира в MVP.

---

## Кратък сценарий за демо
1. Клиент → нова поръчка → виж **`Created`** и празно **Driver**.
2. Офис → секция операции (+ филтър „без шофьор“) → **OK** към **D101**/`D102`.
3. Шофьорът → актуализиран списък задачи и маршрут.

Искаш ли следваща стъпка: например автоматично **ETA текст** според `delivery_option` или **notifications** (toast) след назначение?

---

**User**

1.цялата апликация трябва да е само на британки английски .
2.шофиора трябва да може да вижда всички пратки в 2д карта ,както и да натисне едно копче и да започне да кара към следващата пратка .
3. в офис апа трябва да може да виждат къде е шофиора . да могат да виждат всички пратки за днес или за даден период .

---

**Cursor**

Имплементираме EN-GB в целия UI, разширяваме офис-картата с филтър по период и добавяме в шофьорското приложение изглед на всички пратки + бутон „next delivery“.



Имплементирайки: EN-GB текстове, backend филтри за период + карта, driver map context + delivery queue + UI.



Добавяме backend филтри и новите driver endpoints, после обновяваме трите приложения.



Applying backend patches, then updating the three front ends. Changing the office map to plot shipment markers at destination coordinates (`dest_*`) so stops don’t coincide with driver GPS dots.



Aligning `/dashboard/map` with list filters (`status`, `driverId`, `unassigned`) so the office map matches the operations view.



Updating the dashboard and client apps, rewriting the driver app, adding tests, and running the build.



Ето какво е направено, за да отговорят трите ти изисквания на **British English**.

### 1. Само британски английски (copy)
- `delivery_options.py` — етикети и описания на услуги на английски.
- **`dashboard/src/App.tsx`** — премахнат българският текст от dispatch/филтри; добавена легенда и EN-GB пояснения.
- **`client_app/src/App.tsx`** — формулярът „Нова поръчка“ е на английски (напр. пример адрес Лондон).
- **`driver_app/src/App.tsx`** — надписите са EN-GB (напр. *Navigate to next parcel*, *Could not synchronise…*, *towards*).

API съобщенията за грешки вече са на английски от по-рано.

### 2. Шофьор: всички пратки на 2D карта + един бутон „следваща“
- Нови крайни точки:
  - `GET /api/v1/drivers/{driver_id}/shipments-map-context` — всички пратки с координати на **получателя** (`dest_*`), флаг `assignedToViewer`.
  - `GET /api/v1/drivers/{driver_id}/delivery-queue` — опашка без *Delivered* + `nextShipmentId` (приоритет: *In Transit* → *Delayed* → *Assigned* → *Created*, после дата/id).
- В **driver app**: един **Leaflet** картограф с всички пратки, маршрут и симулирана позиция; бутон **Navigate to next parcel** задава *In Transit* за следващата, включва активния маршрут и **GPS симулация 1 Hz** (както преди по полилинията).

### 3. Офис: позиции на шофьори + пратки за днес / период
- **`GET /api/v1/dashboard/map`** приема същите филтри като списъка: `status`, `driverId`, `deliveryDate`, **`deliveryDateFrom`**, **`deliveryDateTo`**, `unassigned`. Платките на картата са по **planned drop-off** (`dest_lat/lng`), шофьорите — последна GPS/фолбек.
- **Dashboard UI**: интервал „From / To“ + **Today only** + **Clear dates**; същият query се ползва за карта и за таблицата dispatch (вкл. „Unassigned only“).

Файлове с основни промени: `backend/app/main.py`, `backend/tests/test_smoke.py`, `dashboard/src/App.tsx`, `client_app/src/App.tsx`, `driver_app/src/App.tsx`, `driver_app/src/styles.css`, `backend/app/delivery_options.py`.

`pytest` (7 теста) и `npm run build` за трите фронтенда минават успешно.

Ако искаш следваща стъпка: добавяне на колона *Delivery date* в ops таблицата или фино пренареждане на реда на опашката (routing), кажи как предпочиташ да се държи при две активни „In Transit“ пратки.

---

**User**

оправи всички апликации да имат светъл и тъмен режим 

---

**Cursor**

Преглеждам стила на трите приложения и добавя превключване между светла и тъмна тема със запис в `localStorage`.



Добавяме `theme.ts`, `ThemeToggle.tsx` и CSS променливите във всяко приложение; обновяваме `main.tsx`, `styles.css`, `App.tsx` и заглавките.



Ето какво е направено накратко.

### Общ модел (и трите приложения)

- **`data-theme="light"` / `"dark"`** на `<html>` + **CSS променливи** в `styles.css` за всичко на страницата (фонове, панели, таблици, полета, текст, грешки).
- **`localStorage`** ключ **`cmp600-theme`** да помни избора; без запис се ползва **`prefers-color-scheme`**.
- **Inline скрипт в `index.html`** преди root-а за да няма „мигане“ преди да зареди JS.
- **`main.tsx`** вика **`initTheme()`** още преди монтиране на React.
- **`theme.ts`** + **`ThemeToggle.tsx`** (бутон *Dark theme* / *Light theme* с `aria-label` и `aria-pressed`).
- По-добро четене на картите: попъпите и **`leaflet-control-attribution`** следват темата.

### Office dashboard

- Колоните/филтрите наследяват променливите; легенда, dispatch текст и вторични бутони също.

### Client app

- Хедър с тема при login/register и при впишан потребител (до *Log out*).
- Карти, таблица и формуляри са съобразени с тъмен режим.

### Driver app

- В светъл режим: светъл фон и карти по светло; навсякъде текст и граници чрез променливите.
- В тъмен: запазено е поведението като преди по структура.
- Основни бутони/ленти са изнесени към класове (`.primary-cta`, `.btn-header`, текстовете `.text-muted` и т.н.).

Build на трите `npm run build` минава успешно.

Изборът на тема е отделно за всеки билд/host (рядко портите са различни origin), затова между различни приложения локалосториджът не се споделя — ако искаш единна тема между тях само през браузър, трябва един домен + различни path-ве; мога да го добавя по желание.

---

**User**

3д на шофиор аппа трябва да ти показва както гоогле мапс или да прати кординати към гоогле мапс и шофиора да може да кара  . 2д мапа трябва да е като delm8 

---

**Cursor**

Проверявам текущата карта на шофьорското приложение и какво означава „delm8“ в контекста на картите.



Подобряваме 2D картата в стил Delm8 (UK куриерски планер — чиста тъмна/светла база, дебел цветен маршрут) и добавяме навигация към Google Maps (и опционално Waze) с реални координати. Подобряваме 3D MapLibre със стилове, по-близки до „навигационен“ изглед.



Добавяме навигационни връзки към Google Maps/Waze (като Delm8), стилизираме 2D картата с Carto „courier“ плочки и подобряваме 3D MapLibre с Carto GL стилове, по-добър наклон и цветна линия.



Добавяме стиловете и обновяваме `App.tsx`.



Ето какво е направено, в контекста на **Delm8** (UK куриерско планиране – карта + отваряне на Google Maps / Waze за реална навигация) и искането ти за **Google Maps** и **2D като Delm8**.

### Реално „караш“ с Google Maps / Waze
Вграден **пълен 3D Google Maps** в страницата изисква **Google Maps JavaScript API + ключ и билинг**; прототипът го заменя със стандартния подход като Delm8 – **подаване на координати към външното приложение**:

- **`https://www.google.com/maps/dir/?api=1&destination=lat,lng&travelmode=driving`** – без `origin`, за да ползва телефонът **реалния GPS** като начало.
- **`https://www.waze.com/ul?ll=lat,lng&navigate=yes`** – Waze със същата идея.

Бутони **Google Maps** и **Waze** за:
- **следващата спирка в опашката** (над 2D картата),
- **активната доставка** (в панела „Active route“),
- във всеки **popup** на маркер – „Open in Google Maps“.

Допълнително: **„Google Maps from simulated vehicle“** (само ако симулацията е включена) – добавя `origin` от симулираната позиция, за демо на маршрут между „колата“ и дестинацията.

### 2D – „като Delm8“
- Растерни плочки **CARTO** (тъмна **Dark Matter** / светла **Voyager**), по-четими пътища от стандартния OSM тайл.
- **Дебела тюркоазена линия** за активния маршрут + още една по-тъмна отдолу за контраст (courier-style).
- Текстът обяснява Delm8-подобния подход (един екран, ясна линия, външна навигация).

### 3D в приложението (без Google API ключ)
- **MapLibre** вече ползва **CARTO GL** векторни стилове (dark matter / voyager), **наклон ~68°**, по-висок zoom, **двойна линия** на маршрута – по-близо до **изглед „навигация“**, макар и без пълните данни на Google.
- Подсказка: за истинско шофиране да се ползват бутоните към **Google Maps** / **Waze**.

### Нови/променени файлове
- `driver_app/src/mapsLinks.ts` – URL към Google / Waze  
- `driver_app/src/mapTiles.ts` – Delm8-стил плочки  
- `driver_app/src/useThemeMode.ts` + събитие в `theme.ts` – смяна на плочки с темата  
- `RouteMap3D.tsx`, `App.tsx`, `styles.css` – поведение и UI  

Ако по-късно искаш **вграден iframe** или **Maps JavaScript API** (с ключ), мога да добавя конфигурация през `VITE_GOOGLE_MAPS_API_KEY`.

---

**User**

добре.  да направим направим шофиор аппа като delm8 ама по добре искаш ли ?

---

**Cursor**

Преглеждам текущото шофьорско приложение и го пренареждам в по-чист Delm8-подобен интерфейс: списък със спирки, по-добра йерархия и по-изчистена карта.



Пренареждаме работното пространство: hero лента с обобщение на маршрута, карта като основен фокус, дясна колона с номерирани спирки (като Delm8), компактни действия и по-чист панел за активната доставка.



Да — направих го по-на **Delm8**, но по-чисто и фокусирано върху **шофьорския поток**. Ето какво се промени:

### Подредба като професионален route planner
- **Hero лента** с бърза статистика: ред в опашката, чакащи доставки, завършени.
- **`Start next leg`** + бъзи линкове към **Google Maps** / **Waze** за следващата спирка.
- Компактни **`Simulate GPS`** и **`3D preview`** като малки превключватели под героя (не са разхвърляни из картите).

### Главно работно поле (grid)
- **Голяма карта** вляво с chrome лента („Route map“, легенда за цветовете).
- **Дясна колона „Your run“** — **номерирани спирки** от твоята **delivery queue** (като Delm8): тап за центриране на картата, статус като pill, адрес на 2 реда, вертикални бутони **Maps** / **Waze** за всяка спирка.
- **Highlight**: следваща спирка — златиста рамка; активната избрана — тюркоазена.
- Карта се **пренасочва автоматично** към избраната/активна доставка чрез новия `MapRecenter.tsx`.

### Долни панели
- **Active strip**: ясно „Active stop“, големи „Drive with Google Maps / Waze“, опция „From simulated vehicle“, и **закръглени бутони** за статус (Assigned / In transit / Delivered).
- **3D preview** само като секция долу (ако 3D е включено), без да затваря основното поле.

### Други подобрения
- Маркер **„next“** се отличава оптично преди активния избор.
- Секция **„Also assigned“** за работи извън текущата опашка (ако има).
- **Fleet overview** — сгъваемо пояснение за всички точки по картата.
- По-ясна **горна лента**: „CMP600 Driver“ + машиночетим код на потребителя.

Ако искаш следваща стъпка: подредба напълно **mobile-first** (долна навигация като приложение), **drag reorder** на спирките (локално, без backend), или отделни табове **Run / Fleet** — кажи какво има най-голям смисъл за дипломата ти.

---

**User**

така нека направим сравнение и анализ дали покриваме всички точки от документа @CMP600_Dissertation_Project/Developer Checklist,Code Review Criteria.docx ,@CMP600_Dissertation_Project/Developer Implementation Plan.docx 

---

**Cursor**

Чета двата документа и сравнявам с текущото състояние на проекта.



Сравних двата документа с текущото състояние на `CMP600_Dissertation_Project` (код, папки, тестове, Viva). Обобщение по-долу.

---

## Обща оценка

| Област | Покритие | Коментар |
|--------|----------|----------|
| **Implementation Plan — фази 1–4 (код)** | **~95%** | Четирите компонента работят и комуникират; има и допълнения извън минимума |
| **Implementation Plan — фаза 5 (evaluation)** | **~75%** | Има инструменти и бележки; липсва `Tests/usability/` |
| **Implementation Plan — фаза 6 (Viva)** | **~45%** | Папка `Viva/` има презентация, но **няма** задължителните screenshot-и и demo video |
| **Checklist — Code Review (критични)** | **~90% PASS** | Функционалност, стабилност, етика, простота — добре; документацията за дисертацията е непълна |
| **Definition of DONE (план §7)** | **Частично** | Системата е демонстрируема локално; не всички артефакти за Viva/Chapter 6 са готови |

**Заключение:** За **разработка и live demo** сте близо до „готово“. За **пълно покриване на двата документа** (особено Viva + дисертационни глави + root README) има **конкретни липси**.

---

## A. Developer Checklist — по фази

### Daily basics (§A)
| Изискване | Статус | Доказателство |
|-----------|--------|----------------|
| Build без грешки | ✅ | `npm run build` (3 frontends), `pytest` (7 теста) |
| Без реални лични данни | ✅ | Seed: `client1`/`driver1`/`admin` + demo |
| Само симулирани данни | ✅ | `SimulationCoordinator`, GPS/status simulation |
| Старт от чисто състояние | ✅ | SQLite seed при празна БД |
| Backend достъпен | ✅ | `server-control.bat`, порт 8000 |
| Смислени commit съобщения | ⚠️ | Не се проверява от кода — по git history |
| Правилни папки | ✅ | `Source_Code/backend`, `dashboard`, `client_app`, `driver_app` |
| README при промяна | ⚠️ | Има `Source_Code/README.md`; **няма root `README.md`** (планът го изисква) |
| Стабилност / graceful errors | ✅ | HTTP 4xx, UI съобщения за грешки |
| Минимални console logs | ✅ | По принцип ОК |

### Phase 1 — Backend
| Изискване | Статус | Бележки |
|-----------|--------|---------|
| Cloud deploy | ⚠️ | Има `Documentation/Cloud_Deploy_Railway_Render.md` + Dockerfile; **не е потвърдено**, че API е реално качен и работи в cloud |
| API 200 OK | ✅ | `/health`, smoke tests |
| Симулирани пратки | ✅ | `seed.py` |
| GPS simulation | ✅ | `POST /simulation/gps/start`, driver 1 Hz loop |
| Dashboard endpoints | ✅ | `overview`, `map`, `shipments`, `drivers`, `alerts/delayed`, … |
| **API = API_Contract_v1 точно** | ⚠️ | Минималните endpoints **са покрити** + **допълнителни** (`register`, `delivery-queue`, `assign`, `route?dimensions=3`, …). Трябва **ред по ред** сравнение с `Documentation/API_Contract_v1.docx` |
| Глава 5.1 — бележки | ⚠️ | `Implementation_Notes_DEV.md` — кратък черновик, не пълна глава в `Dissertation_Main_Document.docx` |

**Минимални endpoints от плана:** всички ✅  
`GET /dashboard/overview`, `GET /dashboard/map`, `GET /shipments/{id}/tracking`, `POST /drivers/{id}/location`, `POST /simulation/gps/start`, `POST /simulation/status/start`

### Phase 2 — Office Dashboard
| Изискване | Статус | Бележки |
|-----------|--------|---------|
| 2D карта | ✅ | Leaflet |
| Шофьори и пратки на картата | ✅ | + driver positions от location events |
| KPIs (total, in transit, delivered, delayed) | ✅ | |
| Филтри (поне status) | ✅ **над минимума** | status, driver, **date range**, unassigned |
| Обновяване при промяна на backend | ✅ | Poll ~4 s + refresh ms |
| Screenshot `Viva/screenshots/dashboard.png` | ❌ | Папка `Viva/screenshots/` **липсва** |
| Глава 5.4 | ⚠️ | Не попълнена в main dissertation |

### Phase 3 — Driver Application
| Изискване | Статус | Бележки |
|-----------|--------|---------|
| Job list / run | ✅ | Delm8-style numbered **Your run** + queue API |
| 2D маршрут | ✅ | CARTO tiles, thick route line |
| GPS loop | ✅ | 1 Hz + simulation |
| Backend получава GPS | ✅ | `POST /drivers/{id}/location` |
| Dashboard отразява движение | ✅ | Location events → map drivers |
| 3D (optional) | ✅ **бонус** | MapLibre + `dimensions=3` |
| Google Maps / Waze | ✅ **над плана** | Deep links за шофиране |
| Глава 5.3 | ⚠️ | Не в main doc |

### Phase 4 — Client Application
| Изискване | Статус | Бележки |
|-----------|--------|---------|
| Orders list | ✅ | |
| Tracking + status | ✅ | Poll ~3 s |
| ETA | ✅ | |
| Location updates | ✅ | Mini-map от tracking |
| Глава 5.2 | ⚠️ | Не в main doc |
| **Бонус извън плана** | ✅ | Register, create shipment, delivery options |

### Phase 5 — Evaluation Support
| Изискване | Статус | Бележки |
|-----------|--------|---------|
| Response times | ✅ | Header `X-Response-Time-Ms`, `Tests/performance/latency_check.py` |
| Dashboard load time | ✅ | UI показва refresh ms |
| Usability / no critical UX issues | ⚠️ | Има `Evaluation_Heuristics_SUS_Ethics.md`; **няма** `Tests/usability/` |
| Screenshots за Ch.6 | ❌ | Няма в `Viva/screenshots/` |
| Глава 6 | ⚠️ | Не попълнена |

### Phase 6 — Viva Readiness
| Изискване | Статус | Бележки |
|-----------|--------|---------|
| Live demo &lt; 15 min | ✅ | `server-control.bat` [1] Start ALL |
| Demo video | ❌ | `Viva/demo_video.mp4` **липсва** |
| Screenshots | ❌ | `Viva/screenshots/*.png` **липсва** |
| README how to run | ⚠️ | Добър в `Source_Code/README.md`; **root README липсва** |
| В `Viva/` сега | — | Само `Viva_Presentation.docx` / `.pptx` |

---

## B. Developer Implementation Plan — структура и „Definition of DONE“

### Задължителна структура (§2)
| Елемент | Статус |
|---------|--------|
| `Source_Code/backend`, `dashboard`, `client_app`, `driver_app` | ✅ |
| `Documentation/` (Requirements, Architecture, API, Evaluation, Dissertation) | ✅ (имена леко различни от шаблона, но съдържанието е там) |
| `Tests/performance/` | ✅ |
| `Tests/usability/` | ❌ **липсва** |
| `Viva/screenshots/` | ❌ |
| `Viva/demo_video.mp4` | ❌ |
| Root `README.md` | ❌ (има `Source_Code/README.md`) |
| Име `CMP600_Project/` vs `CMP600_Dissertation_Project/` | ⚠️ косметично |

### Definition of DONE (§7) — 7 точки
| Критерий | Статус |
|----------|--------|
| 4 компонента работят и комуникират | ✅ |
| Dashboard live data | ✅ |
| Driver updates на dashboard | ✅ |
| Client tracking | ✅ |
| API stable | ✅ (smoke + local) |
| Live demonstration | ✅ локално |
| Documentation chapters can be filled | ⚠️ има материал (`Implementation_Notes_DEV`, guides), но **главите в dissertation не са попълнени** + липсват screenshot/video |

---

## C. Code Review Criteria — прием / отхвърляне

| # | Критерий | Оценка | Коментар |
|---|----------|--------|----------|
| 1 | **Functional correctness** | ✅ PASS | MVP + extras; препоръка: 1-page matrix срещу `API_Contract_v1.docx` |
| 2 | **Stability** | ✅ PASS | pytest, error handling |
| 3 | **Simplicity / Viva explainability** | ✅ PASS | FastAPI + React, без over-engineering |
| 4 | **Ethics** | ✅ PASS* | Само demo акаунти; `password_plain` в SQLite е **prototype-only** — опиши в дисертацията |
| 5 | **UI & usability** | ✅ PASS | Light/dark, Delm8-style driver, EN-GB |
| 6 | **Performance** | ⚠️ PASS* | Инфраструктурата е налице; **трябва запис** от `latency_check.py` (p50/p95 &lt; 300 ms?) |
| 7 | **Maintainability** | ✅ PASS | Разделени apps, `theme.ts`, `mapsLinks.ts` |
| 8 | **Documentation support** | ❌ **FAIL за Viva** | Няма задължителни screenshot-и и demo video |

**Правило „Clarity &gt; Complexity“:** спазено — Delm8/Google Maps са обясними за Viva.

---

## D. Какво покривате **над** документите (положително за дисертацията)

- Office: assign shipments, delayed alerts, date range, dispatch table  
- Client: registration, new shipment, delivery options  
- Driver: delivery queue, fleet map, Google Maps/Waze, light/dark theme  
- Backend: migrations, `delivery_date`, 3D route coordinates  
- Ops: `server-control.bat`, deploy guide, population guide  

Това **не нарушава** плана, стига в дисертацията да е ясно кое е MVP и кое е stretch.

---

## E. Приоритетен списък „какво липсва“ (за 100% по двата документа)

1. **`Viva/screenshots/`** — поне `dashboard.png`, `driver.png`, `client.png` (както в checklist Phase 2).  
2. **`Viva/demo_video.mp4`** — 10–15 min demo (план Phase 6).  
3. **Root `README.md`** — кратък указател към `Source_Code/README.md` + `server-control.bat`.  
4. **`Tests/usability/`** — дори кратък SUS/heuristic checklist + 1 страница резултати (има шаблон в `Evaluation_Heuristics_SUS_Ethics.md`).  
5. **Попълване на глави 5.1–5.4 и 6** в `Dissertation_Main_Document.docx` от `Implementation_Notes_DEV.md` + screenshot-и + latency цифри.  
6. **Cloud deploy** — един live URL + screenshot в Ch.5/6 (ако изискването „deployed to cloud“ е задължително за оценка).  
7. **API Contract matrix** — таблица endpoint-by-endpoint срещу `API_Contract_v1.docx` (за критерий „exactly“).

---

## F. Препоръчителна оценка за защита

| Аудитория | Вердикт |
|-----------|---------|
| **Supervisor / code review** | **Приемливо** за прототип и demo |
| **Checklist Phase 1–4 (функционално)** | **Готово** |
| **Checklist Phase 5–6 + Documentation** | **Не е готово** без Viva артефакти и dissertation текст |
| **Пълно „Definition of DONE“ от Implementation Plan** | **~85%** |

---

Ако искаш, следващата стъпка може да е едно от двете:

1. **Автоматичен gap checklist** като markdown файл в `Documentation/` (за проследяване), или  
2. **Директно създаване** на `Viva/screenshots/`, root `README.md` и шаблон в `Tests/usability/` — без да пипаме dissertation `.docx`, освен ако поискаш изрично.

---

**User**

Автоматичен gap checklist** като markdown файл в `Documentation/` (за проследяване. после ще направим допълнения по аповете 

---

**Cursor**

Създавам markdown файл за проследяване на пропуските в `Documentation/`, базиран на двата developer документа и текущото състояние на проекта.



Създаден е файлът за проследяване:

**[Documentation/GAP_Checklist_Tracking.md](CMP600_Dissertation_Project/Documentation/GAP_Checklist_Tracking.md)**

### Какво съдържа
- **Легенда** (✅ / ⚠️ / ❌ / ➕) и **кратко резюме** (~85% overall)
- **Секции A–G** — daily checklist + фази 1–6 (ред по ред с ID-та като `P2-08`, `P6-03`)
- **Секция H** — задължителна структура на repo
- **Секция I** — Code Review Criteria (CR-1 … CR-8)
- **Секция J** — API contract matrix (за попълване срещу `API_Contract_v1.docx`)
- **Секция K** — **„Planned app additions“** — празна опашка за следващите подобрения по аповете
- **Секция L** — review log (дата / бележки)
- **Секция M** — one-page **„ready for Viva“** gate (checkbox списък)

### Най-важните ❌ за по-късно (не код сега)
| Gap | ID |
|-----|-----|
| `Viva/screenshots/*.png` | P2-08, P3-08, P4-06, P6-04 |
| `Viva/demo_video.mp4` | P6-03 |
| Root `README.md` | H / P6-05 |
| `Tests/usability/` | P5-06 |
| Глави 5–6 в dissertation | P1-16, P2-09, … |
| Latency таблица в Ch.6 | P5-07 |

Когато започнете допълненията по аповете, добавяйте редове в **секция K** и премествайте ги в съответната фаза с ✅. Ако искаш, в следващия чат можем да попълним секция K с конкретните задачи, които вече си решил (driver / office / client).

---

**User**

нека първо решим  какви ще са задачите после да ги добавим в секция К и след това да започнем да ги правим готов ли си ?

---

**Cursor**

Преглеждам секция K и пропуските, за да предложа ясен, приоритизиран списък задачи за съгласуване.



Да — готов съм. Логиката е правилна: **първо списък → запис в секция K → после изпълнение по приоритет**.

По-долу е предложение за задачи, групирани така, че да затворим **gap checklist-а** и да не разпиляваме времето преди Viva.

---

## Предложен план (3 вълни)

### Вълна 1 — „Затваряме дупките от документите“ (без големи нови функции)
| ID | Задача | Къде | Защо |
|----|--------|------|------|
| **N-06** | Root `README.md` (кратък: старт, портове, `server-control.bat`, линк към `Source_Code/README.md`) | repo | Implementation Plan §2, Phase 6 |
| **N-11** | Папка `Viva/screenshots/` + `README` какво да снимаш (имена на файлове) | Viva | P2-08, P6-04 |
| **N-12** | `Tests/usability/` — шаблон (heuristic checklist + празна таблица за 3–5 минути тест) | Tests | P5-06 |
| **N-13** | Пусни `latency_check.py`, запиши резултатите в `Tests/performance/results.md` (или `.txt`) | Tests | P5-07, CR-6 |
| **N-14** | Попълни **секция J** в gap файла след сравнение с `API_Contract_v1.docx` | Documentation | CR-1 |
| **N-15** | Кратък **Viva demo script** (10–15 min стъпки) в `Viva/DEMO_SCRIPT.md` | Viva | P6-02 |

*Това са предимно файлове + един скрипт — бързо, висока стойност за дисертацията.*

---

### Вълна 2 — „Довършване на трите приложения“ (малки, ясни подобрения)
| ID | Задача | App | Защо |
|----|--------|-----|------|
| **N-16** | Office: колона **Delivery date** в dispatch таблицата + синхрон с филтрите | dashboard | Офис „днес / период“ — по-пълен Delm8/office flow |
| **N-17** | Office: бутон **„Today only“** вече има — провери, че map + table + KPI са консистентни след refresh | dashboard | QA |
| **N-18** | Driver: при **Start next leg** опционално отваряне на Google Maps (confirm dialog) | driver | Delm8 „navigate out“ |
| **N-19** | Driver: **mobile** — на тесен екран списъкът отгоре, картата отдолу (CSS only, без bottom nav засега) | driver | По-добър от N-04 за Viva на телефон |
| **N-20** | Client: след **Create shipment** — ясно съобщение + highlight на новия ред в таблицата | client | UX polish |
| **N-21** | Трите apps: единна **footer** „CMP600 prototype · simulated data“ (ако липсва) | all | Consistency |

*Без drag-reorder и без вграден Google Maps API (ключ) — риск за Viva.*

---

### Вълна 3 — „Ти / ръчно“ (не мога да ги свърша вместо теб, но подготвяме)
| ID | Задача | Кой |
|----|--------|-----|
| **N-07** | Screenshot-и: `dashboard.png`, `driver.png`, `client.png` | Ти (след Wave 2 UI freeze) |
| **N-08** | `demo_video.mp4` по `DEMO_SCRIPT.md` | Ти |
| **N-09** | 1 кратък usability pass (попълни шаблона от N-12) | Ти + приятел/колега |
| **N-10** | Копирай текст от `Implementation_Notes_DEV.md` + latency + screenshots в **Ch.5–6** | Ти |
| **N-22** | Cloud deploy (Railway) + URL в README | По избор / ако изискват cloud |

---

### Отложено (не в този sprint, освен ако настояваш)
| ID | Задача | Причина |
|----|--------|---------|
| N-04 | Bottom navigation | Повече работа; Wave 2 mobile layout е достатъчен |
| N-05 | Drag reorder на спирки | Няма backend — само local state; риск „feature без обяснение“ |
| — | Вграден Google Maps JS API | Ключ, billing, извън academic MVP |

---

## Препоръчителен ред на изпълнение (когато кажеш „давай“)

1. **N-06, N-11, N-12, N-13, N-15** (инфраструктура + evidence)  
2. **N-14** (API matrix)  
3. **N-16 → N-21** (app polish)  
4. Ти: **N-07, N-08, N-09, N-10**

---

## Какво трябва от теб сега (1 минута)

Отговори с нещо като:

- **„Съгласен, вълни 1+2“** — записвам в секция K и започвам от N-06.  
- Или **промени**: напр. „пропусни cloud“, „добави drag reorder“, „само Viva файлове първо“.  
- Или **приоритет само apps**: тогава започваме от N-16–N-21 и отлагаме Viva папките.

След твое **OK** обновявам `GAP_Checklist_Tracking.md` секция **K** с пълната таблица (статус ☐) и веднага започвам **Вълна 1**.

---

**User**

първо ше направим подобрения на аповете после другите задачи .запиши всички предложени от теб задачи и за промени кажи че си готов и аз ще ти дам условията на нещата които да променим по аповете в съответствие с дисертацията 

---

**Cursor**

Записвам всички задачи в секция K с приоритет: първо приложенията, после останалото.



Готово. Всички предложени задачи са записани в **[Documentation/GAP_Checklist_Tracking.md](CMP600_Dissertation_Project/Documentation/GAP_Checklist_Tracking.md)** — **секция K**, с три спринта:

| Спринт | Кога | ID-та |
|--------|------|--------|
| **A — Apps (първо)** | Сега | N-16 … N-21 + N-01…N-03 (резерв за твоите изисквания) |
| **B — Repo / tests / Viva prep** | След apps | N-06, N-11 … N-15 |
| **C — Ръчно** | После | N-07 … N-10, опционално N-22 |
| **Отложено** | По желание | N-04, N-05 |

---

**Готов съм** за следващата стъпка: изпрати условията за промени по приложенията **в съответствие с дисертацията**.

Удобно е да ги дадеш така (на български или английски — UI текстът в apps остава **British English**):

1. **Office dashboard** — какво трябва да вижда/прави офисът (карта, KPI, филтри, assign, …).  
2. **Driver app** — поток на шофьора (опашка, навигация, карта, статуси, …).  
3. **Client app** — какво прави клиентът (поръчки, tracking, регистрация, …).  
4. **Backend/API** — ако искаш нови endpoints или промени в данните.  
5. **Какво да НЕ пипаме** (за Viva стабилност).

Мога да добавя нови редове **N-01, N-02, N-03** в секция K с твоите точки, и след това започваме **Sprint A** по ред.

---

**User**

добре качил съм ти снимки от делм8 апа искам да кажеш кои от нещата са добри и липсват на нашия ап и да ги добавим или направим по добре . трябва да стане по добре от делм8

---

**Cursor**

Преглеждам текущото шофьорско приложение и сравнявам го с функциите от Delm8 на снимките.



Добавям анализа и обновените задачи в секция K.



Ето сравнителният анализ по снимките от **Delm8** и какво правим с **нашия driver app**, за да е **по-добър в контекста на дисертацията** (не само „копие на Delm8“).

---

## Какво Delm8 прави много добре (да вземем)

| Екран / идея | Защо работи |
|--------------|-------------|
| **Карта на цял екран** + синя линия на маршрута | Веднага виждаш реда и посоката |
| **Номерирани спирки** (1, 2, 3…) на картата | Ред = ред на доставка |
| **Route summary** (брой спирки, мили, час на приключване) | Мотивация и планиране за деня |
| **Map ↔ List** долу | На телефон: списък с Dist/ETA; на десктоп: карта |
| **Долен панел за активна спирка** | Адрес, ETA, „N stops to go“, **Navigate**, **Done**, Edit |
| **Optimise** | Преподреждане за по-кратък маршрут |
| **Navigate** към външно приложение | Реално шофиране (при нас: Google Maps / Waze) |
| **Търсене** в списъка | Бързо намиране на адрес |
| **Карта: locate + fit route** | Практични бутони вдясно |

---

## Какво вече имаме (добро) / какво липсва

| Функция | Нашият app | Delm8 |
|---------|------------|-------|
| Опашка „Your run“ с номера | ✅ (встрани) | ✅ (list) |
| Google Maps / Waze | ✅ | ✅ Navigate |
| Start next leg + GPS sim | ✅ | (външна навигация) |
| 3D preview | ✅ бонус | ❌ |
| Light/dark | ✅ | ❌ |
| **Номера на картата** | ❌ | ✅ |
| **Map ↔ List** | ❌ | ✅ |
| **Route summary** (мили, finish time) | ❌ | ✅ |
| **Долен sheet** (ETA, stops left, Done) | ❌ частично | ✅ |
| **Optimise** | ❌ | ✅ |
| **Edit stop** (бележки, failed) | ❌ | ✅ |
| **Търсене** | ❌ | ✅ |
| **Map controls** (fit/locate) | ❌ | ✅ |

---

## Къде сме **по-добри от Delm8** (важно за дисертацията)

Delm8 е **само шофьор**. CMP600 е **цяла система**:

1. **Клиент** създава пратка → **офис** я назначава → **шофьор** я вижда в опашката.  
2. **Офис картата** вижда шофьора на живо + закъснели + филтри по дата.  
3. Всичко е **симулирано, обяснимо, с API и тестове** — подходящо за Viva.

Това е основният аргумент „по-добре“: **интеграция + visibility**, не още един standalone route app.

---

## Какво **не** копираме от Delm8 (нарочно)

- Глас, камера, scan manifest  
- Шофьорът сам добавя спирки / postcode (при нас: **client + office**)  
- Вграден Google Maps в страницата (ключ, разходи)  
- Пълен „Edit Route“ с depot start/finish (офисът планира)

---

## Задачи, записани за Sprint A (секция K)

В **[GAP_Checklist_Tracking.md](CMP600_Dissertation_Project/Documentation/GAP_Checklist_Tracking.md)** и **[Delm8_vs_CMP600_Driver_Analysis.md](CMP600_Dissertation_Project/Documentation/Delm8_vs_CMP600_Driver_Analysis.md)**:

| Приоритет | ID | Какво |
|-----------|-----|--------|
| **P0** | D-01 | Map ↔ List + Dist/ETA в списъка |
| **P0** | D-02 | Номерирани pin-ове на картата |
| **P0** | D-03 | Route summary (спирки, мили, прогнозен край) |
| **P0** | D-04 | Долен панел: Navigate, Done, Edit |
| **P1** | D-05 … D-11 | Fit/locate, search, optimise (simulated), mobile sheet, … |
| Office/Client | N-16, N-20, N-21 | Малки довършвания |

---

## Готов съм за имплементация

Предлагам ред: **D-01 → D-02 → D-03 → D-04** (един нов driver UX „като Delm8, но по-чист“), после P1.

Напиши **„давай“** или промени приоритета (напр. само карта + list, без optimise). След това започвам код в `driver_app` без да чакаме останалите спринтове (Viva файлове).

---

**User**

давай

---

**Cursor**

Започваме имплементацията на Delm8-подобния driver UX: P0 (D-01–D-04), след това P1.



Добавяме помощни модули и компоненти, след което преструктурираме driver app.



I used `motion` instead of `motion`/`motion` by mistake — replacing those tags with `div`.


Continuing the Delm8 driver UX: fixing imports, adding courier CSS, and verifying the build.


Adding courier CSS and a mobile collapsible stop list (D-11), plus a 3D route toggle.


**Delm8-style driver sprint (D-01–D-11) is in place.** Build and tests pass.

### What you get in the driver app
- **Map ↔ List** — bottom nav; list shows dist/ETA, depot row, priority badges
- **Numbered pins** — queue order on the map (next = gold, active = teal)
- **Route summary** — stops, simulated miles, projected finish
- **Active stop sheet** — Navigate (Google Maps), Done, Edit
- **Map controls** — locate + fit route (floating buttons)
- **Search** — filter stops on map and list
- **Optimise** — nearest-neighbour reorder (client-side only; message in UI)
- **Edit stop** — local notes; mark delivered / delayed
- **Default map** — your run only; optional **Fleet view** toggle
- **Start + Maps** — confirm before opening Google Maps
- **Mobile** — collapsible stop sheet over the map (&lt;720px)
- **3D preview** — checkbox always visible when a leg is active

### New / updated files
- `driver_app/src/App.tsx` — main courier UI
- `driver_app/src/courier-styles.css` — Delm8 layout styles
- `routeMetrics.ts`, `stopNotes.ts`, `NumberedMarker.tsx`, `MapControls.tsx`
- `GAP_Checklist_Tracking.md` — D-01…D-11 marked ✅

### How to try it
1. Run `server-control.bat` (or start backend + `driver_app` on port **5175**).
2. Log in: **driver1** / **demo**.
3. Use **Map / List / Optimise**, tap a numbered pin, **Start next leg** or **Start + Maps**.

`npm run build` (driver) and **7 pytest** tests passed.

**Next (Sprint A leftovers):** dashboard **N-16** (delivery date column), **N-20**, **N-21**, then Sprint B (root README, Viva screenshots, latency results). Say if you want those next.

---

**User**

давай

---

**Cursor**

Продолжаем Sprint A: N-16, N-20, N-21. Сначала посмотрю, что именно требуется в чеклисте.


Implementing N-16, N-20, and N-21 across dashboard, client, and driver apps.


**Sprint A (N-16, N-20, N-21) готов.** Все три приложения собираются без ошибок.

### N-16 — Office dashboard
В таблице dispatch добавлена колонка **Delivery date** (формат `en-GB`, например `15 May 2026`).

### N-20 — Client app
После **Create shipment**:
- зелёный баннер с ID новой посылки;
- строка в таблице подсвечивается (синяя полоса + пульс ~8 с);
- автоматически открывается tracking для новой посылки;
- форма очищается.

### N-21 — Footer во всех приложениях
Единый текст внизу: **«CMP600 prototype · simulated data»** — dashboard, client, driver (включая экраны входа).

---

**Sprint A по приложениям закрыт** (D-01…D-11 + N-16, N-20, N-21).

**Дальше — Sprint B** (репозиторий / Viva):
- корневой `README.md`
- `Viva/screenshots/`
- шаблон usability + `latency_check` results
- заполнение Ch.5–6 в dissertation

Напиши **«давай»** — начну Sprint B, или укажи приоритет (например, только README + скриншоты).

---

**User**

може ли да говорим на български не на руски 

---

**Cursor**

Разбира се — оттук нататък ще пиша на **български**.

Досега използвахме „давай“ и подобни изрази, които са общи и на двата езика; няма проблем да продължим изцяло на български.

**Къде сме:** Sprint A е готов (driver Delm8 UX, N-16, N-20, N-21). Следващата логична стъпка е **Sprint B** — root `README.md`, папка за Viva screenshots, usability шаблон, резултати от latency теста и т.н.

Кажи **„давай“** (или какво точно искаш първо), и продължаваме на български.

---

**User**

добре първо искам да довършим промените . в list изчезват стоповете който са completed трябва да остават и да за в сиво с надпис done и при нужда да се подновяват .

---

**Cursor**

Преглеждам как се формира списъкът в driver app и защо завършените спирки изчезват.


Проблемът е, че API `delivery-queue` изключва доставените пратки — ще ги запазим в списъка от fleet данните и ще ги покажем в сиво с „Done“.


Готово. Завършените спирки вече **не изчезват** от List.

### Какво беше проблемът
API `delivery-queue` връща само отворени пратки (без `Delivered`), затова след **Done** те паднаха от списъка.

### Какво променихме
1. **Списъкът** се гради от всички пратки на шофьора (`assignedToViewer` от картата), не само от опашката — завършените остават **в края**, със запазен ред при ръчно подреждане.
2. **Визуализация** — сив ред, badge **Done**, текст *Completed* вместо ETA.
3. **Refresh** — бутон в List за ръчно обновяване (освен автоматичното на ~4 s).
4. **Мобилният sheet** — показва и завършените спирки с „Done“.

На картата маршрутът все още минава само през **незавършените** спирки (логично за навигация); в List всички остават видими.

Презареди driver app (`driver1` / `demo`), маркирай спирка като Done и провери в **List** — трябва да остане сива с „Done“. Ако искаш нещо друго (напр. „възстанови“ статус от Edit), кажи.

---

**User**

трябва да може при нужда да се променя от done в активна 

---

**Cursor**

Проверявам API за статуси и екрана Edit stop, за да добавим възможност да върнем спирка от Done към активна.


Добавяме „Mark active again“ в Edit и коригираме `updateStatus`, за да работи с избраната (не само активната) спирка.


Готово — вече можеш да върнеш спирка от **Done** обратно в активен маршрут.

### Как работи

**В List (сив ред с Done):**
- **Active** — връща статус `Assigned` (отново в опашката)
- **Edit** → **Mark active again** или **Resume in transit** (`In Transit`)

**В Edit** (за завършена спирка):
- **Mark active again** → `Assigned`
- **Resume in transit** → `In Transit`

След реактивиране спирката става активна на картата, излиза от сивия вид и отново влиза в маршрута.

Презареди driver app и тествай: Done → **Active** или Edit → **Mark active again**. Ако искаш само един бутон вместо два, кажи.

---

**User**

добре сега как може да пооправим оптимизацията на маршрута ? и симулацията на шофиор 

---

**Cursor**

Преглеждам текущата оптимизация на маршрута и симулацията на шофьора, за да предложа и приложим подобрения.


Подобряваме оптимизацията (depot + 2-opt) и GPS симулацията (пълен маршрут, скорост, по-умен backend).


Подобрихме и двете неща. Ето какво беше проблемът и какво е новото:

## Оптимизация на маршрута

**Преди:** nearest-neighbour от първата спирка в списъка (без depot), без подобрение на реда.

**Сега:**
1. **Старт от depot** (симулиран хъб в Лондон) — както в реалните route planners.
2. **Nearest-neighbour** от depot към всички отворени спирки.
3. **2-opt** — втори проход, който скъсява реда (класическа VRP евристика за дисертацията).
4. **ETA / разстояния** — първият крак е depot → спирка 1.
5. **Съобщение при Optimise** — общи мили + колко мили са спестени спрямо предишния ред.

Синята линия на картата вече тръгва от **depot** и минава през спирките в реда на обиколката.

---

## GPS симулация на шофьора

**Преди:** само точките по polyline на **активната** пратка, на 1 s — не изглеждаше като цял маршрут.

**Сега:**
1. Пътят е **depot → всички отворени спирки** по реда в List (с плавни междинни точки).
2. При активен leg се използва polyline от API, ако съвпада с маршрута.
3. **Скорост:** Slow / Normal / Fast (при включен GPS sim).
4. Позицията се праща към office dashboard на всеки tick.

**Backend** (`simulator.py`): GPS симулацията следва пратка **In Transit**, после Assigned/Delayed — не първата по ID.

---

## Как да тестваш

1. Влез като `driver1` / `demo`.
2. **Optimise** — виж съобщението за мили и спестени разстояния.
3. Включи **GPS sim** → избери скорост → зелената точка трябва да се движи по целия маршрут.
4. На office dashboard — позицията на шофьора се обновява.

---

## Какво още може (ако искаш по-късно)

| Подобрение | Забележка |
|------------|-----------|
| Реални пътища (OSRM / Google Directions) | Изисква външен API |
| Запазване на оптимизирания ред на сървъра | Нов endpoint |
| Авто-„Done“ при пристигане | Разстояние &lt; X mi от спирката |
| Depot от профила на шофьора | Настройка в backend |

Кажи ако искаш някое от тези да го имплементираме следващо.

---

**User**

запиши тези да ги направим по късно :
Реални пътища (OSRM / Google Directions)
Изисква външен API
Запазване на оптимизирания ред на сървъра
Нов endpoint
. 
сега искам да направим да може да се избират тези отпции от снимката 

---

**Cursor**

Записвам бъдещите задачи в документацията и имплементирам екрана „Edit Route“ по снимката.


Готово. Записах бъдещите задачи и добавих екрана **Edit Route** като на снимката.

## Записано за по-късно (`GAP_Checklist_Tracking.md`)

| ID | Какво |
|----|--------|
| **D-13** | Реални пътища (OSRM / Google Directions) — външен API |
| **D-14** | Запазване на оптимизирания ред на сървъра — нов endpoint |

## Нов екран **Edit Route** (D-12)

**Отваряне:** натисни картата **Route summary** („Tap to edit route“).

**Полета (като Delm8):**

| Поле | Действие |
|------|----------|
| **Name** | Име на маршрута |
| **Start time** | Дата/час (икона 🕐 → `datetime-local`) |
| **Start from** | Depot или спирка от списъка |
| **Finish at** | Къде приключваш (често същият depot) |
| **Stop time** | Време на спирка: 2–30 min (0h 04m и т.н.) |
| **Mark as default** | Запазва настройките по подразбиране на устройството |

**Cancel / Save** — Save записва в `localStorage` (прототип, не на сървъра).

**Depot опции (симулирани):**
- London depot  
- **LS27 7JQ · Gildersome Link** (като на снимката)  
- Всяка спирка от текущия run  

**Какво влияят настройките:**
- **Optimise** — старт от избрания „Start from“
- **ETA / мили** — start time + stop time
- **GPS sim** — маршрут depot → спирки → finish (ако е различен)
- **Синя линия** на картата — същият маршрут

---

Презареди driver app → **Route summary** → Edit Route → промени **Start from** / **Stop time** → **Save** → **Optimise**.

Ако искаш бутон **Route** в долната лента (вместо tap на summary), кажи.

---

**User**

добре сега трябва да го направим повече mobile friendly 

---

**Cursor**

Преглеждам текущите стилове и layout, за да подобрим мобилното изживяване.


Правя mobile-first layout: пълноекранна карта, по-големи бутони и фиксирана долна лента.


Готово — driver app е по-пригоден за телефон. Ето какво се промени:

### Mobile layout (Delm8 стил)
- **Пълноекранна карта** — заема останалата височина на екрана (`100dvh`)
- **Компактна лента Route summary** отгоре (tap → Edit Route)
- **Долен панел** (`map-bottom-dock`): спирки, активна спирка, Start leg / GPS
- **Фиксирана навигация** Optimise · Map · List с `safe-area` за iPhone
- **List** — пълен скрол, sticky търсене + Refresh

### Touch & UX
- Бутони **≥ 44px** (Navigate, Done, Start leg, nav)
- **font-size: 16px** в полетата за търсене (без zoom на iOS)
- Модали **отдолу** (bottom sheet) за Edit stop
- Скрити на мобилно: footer, 3D preview (по-малко смущения)

### Технически
- `viewport-fit=cover`, `theme-color`, PWA meta tags
- Нов файл: `mobile-driver.css`

### Как да тестваш
1. Презареди driver app (порт **5175**)
2. Отвори DevTools → **Toggle device toolbar** (iPhone)
3. Map — карта + долен панел; List — скролващ се списък

На широк екран (>720px) остава desktop layout.

Ако искаш още: икони в bottom nav, swipe между Map/List или pull-to-refresh — кажи.

---

**User**

на делм8 на map целия екран е картата а бутоните са плаващи върху екрана може ли и тук да го направим така и като избере стоп от картата се отваря малък плаващ прозорец ?

---

**Cursor**

Преструктурираме map изгледа: пълноекранна карта с плаващи контроли и компактен панел при избор на спирка.


Създавам пълноекранна карта с плаващи контроли и Delm8-style панел при избор на спирка.


Добавям fullscreen CSS и преструктурирам map изгледа в `App.tsx`.


Поправям грешката с `motion` и довършвам fullscreen картата.


Поправям счупения JSX таг и преструктурирам map секцията.


Заменям долния dock с плаващи контроли — внимавам да не въведа грешни тагове.


Използвам скрипт за замяната, за да избегна грешки с таговете.


Има излишни затварящи тагове — поправям структурата и пускам build.


Довърших Delm8-style fullscreen картата в driver app. Ето какво е готово:

### Карта на цял екран
- При изглед **Map** картата заема целия екран (`courier-map-stage--fullscreen`, `map-wrap--fullscreen`)
- На мобилен topbar се скрива (`driver-app--map-focus`)

### Плаващи контроли
- **Горе:** меню (Edit route), търсене, chip с брой спирки, превключване на тема
- **Отдясно:** центриране, fit на маршрута, fleet view, GPS sim
- **FAB ▶:** Start next leg
- **Toast** за грешки/съобщения върху картата

### Избор на спирка
- Клик по маркер отваря **`StopFloatCard`** (Dist / ETA / адрес / Navigate / Done / Edit)
- Премахнати са Leaflet `Popup` и старият bottom dock (sheet + mobile list + quick bar)

### List изглед
- Route summary и alerts остават само извън map view

`npm run build` в `driver_app` минава успешно.

Стартирай `server-control.bat` и отвори driver app (порт 5175) → Map, за да видиш новия UI. Ако искаш, мога да добавя long-press на FAB за „Start + Maps“ или GPS speed selector в плаващия слой.

---

**User**

добре направи това повече mobile freandly.

---

**Cursor**

Преглеждам текущите стилове и форматирането на ETA, за да подобрим мобилния изглед.


Подобрявам мобилния UX: форматиране на ETA, по-големи touch targets в списъка и по-добър float card на картата.


Направих mobile-friendly подобренията. Ето какво се промени:

### List изглед
- **Бутони под всяка спирка** (Navigate + Edit) — по-широки, в един ред, min. ~48px височина (удобни за палец)
- **По-голям текст** за адрес и Dist/ETA
- **Търсене + Refresh** — по-високи полета (3rem)
- **Скрит дублиращ route summary** (остава само картата отгоре)
- **Компактен header** — „Log out“ → „Out“, по-кратък theme toggle

### Map изглед (float card)
- **Done** — ярко зелен фон + бял текст (четим на dark theme)
- **По-големи** Dist/ETA/Remaining и action бутони
- **По-малър panel** (~36vh), по-голям × за затваряне
- **По-големи** странични контроли (locate, fit, fleet, GPS)
- Адресът вече **не е ALL CAPS** на телефон

### ETA формат
- ISO стойности като `2026-05-10T16:00:00Z` се показват като **`Sat, 10 May, 16:00`** (en-GB)

Build-ът минава успешно. Презареди driver app (5175) и тествай на телефон или DevTools mobile view.

---

**User**

когато приближа да видя даден стоп и малко след това картата се рефрешва и дава цялостен overview , трябва да има малко бутонче за това и да спре да рефрешва картата до цялосно overview

---

**Cursor**

Търся какво предизвиква автоматичното fit на картата при zoom.


Картата се връща към overview, защото `MapFitBounds` се задейства при всяка промяна на маршрута, а `MapRecenter` — при всяко обновяване. Ограничавам fit/recenter само до ръчни действия (бутон + избор на спирка).


Готово. Проблемът беше, че картата автоматично правеше **fit на целия маршрут** при всяко обновяване на данните (на всеки ~4 s) и при всяка промяна на polyline.

### Какво се промени

**Спира автоматичният zoom-out**
- **Full route (⛶)** — само при натискане на бутона (или след Optimise / Edit route)
- **Центриране (⊕)** — само при натискане или при избор на спирка
- Ръчното приближаване/местене на картата вече **не се презаписва** от sync-а

**Първо отваряне на Map**
- Един път показва целия маршрут; след това остава на теб

**Бутон ⛶** (вдясно на картата)
- Tooltip: *Show full route overview*
- Единствен начин да върнеш целия overview след като си zoom-нал

Презареди driver app и тествай: zoom към спирка → изчакай няколко секунди → картата трябва да остане там; за целия маршрут натисни **⛶**.

---

**User**

добре сега трябва да изглежда по добре и в съответствие с аппа

---

**Cursor**

Преглеждам текущия Edit stop modal и стиловете на приложението.


Преработвам Edit stop като bottom sheet в стила на останалата част на приложението.


Подобрих **Edit stop** екрана, за да съвпада с останалата част на driver app (float card + Edit Route).

### Нов дизайн
- **Bottom sheet** с drag handle, blur backdrop и slide-up анимация
- **Header** с номер на спирката (червен badge), ID и бутон ×
- **Адрес + статус pill** под заглавието
- **Бележки** в teal поле (като accent на картата), с placeholder
- **Update status** — два големи бутона в мрежа (Delivered / Delayed), четливи на dark theme
- **Footer** — Cancel + **Save changes** (teal, като primary action в app-а)

### UX
- Tap извън sheet-а → затваря
- Safe area за iPhone home indicator
- По-големи touch targets (~48px+)

Презареди driver app и отвори **Edit** от картата или списъка, за да видиш новия sheet.

---

**User**

DOM Path: div#root > div.driver-app driver-app--courier driver-app--map-focu > main.driver-main driver-main--courier driver-main--map driver-main--map-full.creen > div.courier-map-.tage courier-map-.tage--full.creen > div.map-float-layer > div.map-toa.t map-toa.t--ok
Position: top=58px, left=8px, width=665px, height=39px
React Component: App
HTML Element: <div class="map-toast map-toast--ok" data-cursor-element-id="cursor-el-1">Stop active again · S2001</div>  този надпис седи постоянно върху екрана 

---

**Cursor**

Търся как се управлява `navMsg` и защо toast-ът не изчезва.


Добавям автоматично скриване след няколко секунди и бутон за затваряне на toast-а.


Поправих го. Toast съобщенията като „Stop active again · S2001“ оставаха завинаги, защото `navMsg` никога не се изчистваше.

### Промени
- **Автоматично скриване** след 4 секунди за всички success съобщения (`navMsg`)
- **Бутон ×** на toast-а за ръчно затваряне (и на картата, и при грешки)
- Премахнато е съобщението „Opening Google Maps…“ при Navigate (излишно пречеше)

Грешките (`err`) **не** се скриват сами — остават, докато ги затвориш, за да не пропуснеш проблем.

Презареди app-а — след действие като „Mark active“ banner-ът трябва да изчезне сам след няколко секунди.

---

**User**

добре изглежда супер , сега да направим обобщение какво е свършено и какво остава да се свърши 

---

**Cursor**

Ето обобщение на проекта **CMP600** към момента:

---

## Общ статус

| Област | Покритие | Блокер за Viva? |
|--------|----------|-----------------|
| Backend | ~95% | Не (локално demo е ОК) |
| Office dashboard | ~95% | Не |
| Driver app | ~100% (функционално) | Не |
| Client app | ~95% | Не |
| Evaluation (тестове, latency) | ~75% | **Да** — трябва да се пусне и документира |
| Viva материали | ~45% | **Да** — screenshots + video |
| Дисертация (гл. 5–6) | ⚠️ частично | **Да** — текст в основния документ |

**Общо „готово за демо“:** ~**85%** — системата работи end-to-end; остават артефакти за оценка и Viva.

---

## Какво е свършено

### Ядро на системата (4 приложения)
- **Backend:** FastAPI + SQLite, seed данни, симулация GPS/статуси, dashboard API, tracking, delivery queue, 3D route (stretch)
- **Dashboard:** 2D карта, KPI, филтри (статус, шофьор, дата), dispatch таблица, delayed panel, light/dark theme
- **Client:** поръчки, tracking, ETA, мини-карта, регистрация, create shipment + success feedback
- **Driver:** опашка спирки, GPS sim, статуси, fleet map, 3D preview (stretch)

### Sprint A — Delm8-style driver UX ✅
| ID | Какво |
|----|--------|
| D-01 … D-11 | Map/List, номерирани pin-ове, route summary, active stop panel, search, optimise (NN+2-opt), edit stop, fleet toggle, Start+Maps, mobile sheet |
| D-12 | Edit Route (localStorage: име, час, depot, stop time) |
| N-16, N-20, N-21 | Delivery date в office; client success след create; footer „prototype · simulated data“ |

### Допълнителна работа (последните сесии) ✅
- **Fullscreen карта** — плаващи контроли, `StopFloatCard` (Dist/ETA/Navigate/Done/Edit)
- **Mobile-friendly** — по-големи бутони в list, подобрен float card, форматиране на ETA (ISO → четим вид)
- **Карта не „подскача“** — overview само с бутон **⛶**; центриране с **⊕** / избор на спирка
- **Edit stop** — bottom sheet в стила на app-а (teal Save, status grid)
- **Toast** — `navMsg` изчезва след 4 s + бутон ×
- **Delivered stops** остават в list; reactivate (Mark active / Resume in transit)
- Подобрен route sim + GPS speed (Slow/Normal/Fast)

### Техническа стабилност ✅
- `npm run build` за трите frontend-а
- `pytest` за backend
- `server-control.bat` — старт на всички услуги (8000, 5173–5175)
- Demo акаунти: `driver1` / `client1` / `admin` → `demo`

---

## Какво остава

### Sprint A — дребни / по желание
| ID | Какво | Приоритет |
|----|--------|-----------|
| N-17 | Office: еднакви филтри map ↔ table (QA) | A2 |
| N-01 … N-03 | Допълнителни правила от дисертацията (ако имаш) | — |

### Отложено (съзнателно out of scope за Viva)
| ID | Какво |
|----|--------|
| **D-13** | Реален road routing (OSRM / Google Directions) |
| **D-14** | Запазване на optimised order на сървъра |
| N-04, N-05 | Mobile bottom nav (частично има); drag reorder |

### Sprint B — Repo, тестове, документация
| ID | Какво |
|----|--------|
| N-06 | Root `README.md` |
| N-11 | `Viva/screenshots/` + README какво да снимаш |
| N-12 | `Tests/usability/` — шаблон + резултати |
| N-13 | Пусни `latency_check.py` → таблица за гл. 6 |
| N-14 | API matrix vs `API_Contract_v1.docx` (секция J) |
| N-15 | `Viva/DEMO_SCRIPT.md` (10–15 min demo) |

### Sprint C — Ръчно / дисертация (твоя страна)
| ID | Какво |
|----|--------|
| N-07 | Screenshots: `dashboard.png`, `driver.png`, `client.png` |
| N-08 | `Viva/demo_video.mp4` |
| N-09 | Една usability сесия → попълни шаблона |
| N-10 | Глави **5.1–5.4** и **6** в `Dissertation_Main_Document.docx` |
| N-22 | Cloud deploy (Railway/Render) — **по избор** |

### Code review / Viva gate (всички трябва ✅)
- [ ] `pytest` + трите `npm run build`
- [ ] Demo репетиция &lt; 15 min с `server-control.bat`
- [ ] 3 screenshot-а в `Viva/screenshots/`
- [ ] Demo video
- [ ] Latency таблица в гл. 6
- [ ] Usability review документиран
- [ ] API contract matrix завършена

---

## Препоръчителен ред напред

1. **Снимки + demo script** (N-07, N-11, N-15) — UI вече е стабилен  
2. **Latency + usability** (N-12, N-13, N-09) — за глава 6  
3. **Дисертация** (N-10) — чернови от `Implementation_Notes_DEV.md` / `Evaluation_Heuristics_SUS_Ethics.md`  
4. **Video** (N-08) — след репетиция на live demo  
5. По желание: cloud (N-22), D-13/D-14

---

## Какво да покажеш на Viva (вече силни страни)

- **3-app flow:** client създава → office assign → driver queue + GPS → dashboard вижда движението  
- **Driver UX:** Delm8-подобна карта + list, optimise, external Google Maps  
- **Интеграция:** един backend, simulated data, ethics-safe  
- **Stretch:** 3D route, themes, delayed alerts, delivery options  

Ако искаш, мога да обновя `GAP_Checklist_Tracking.md` с последните промени (fullscreen map, toast, camera fix) или да подготвя чернова на **DEMO_SCRIPT.md** за 10–15 минути.

