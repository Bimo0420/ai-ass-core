# План наведения порядка в проекте AI Stack

## Обзор проблем

В проекте выявлены следующие проблемы с организацией файлов:

| Проблема | Текущее состояние | Решение |
|----------|-------------------|---------|
| SQL файлы в корне | 4 файла `*.sql` | Перенести в `deployments/docker/supabase/migrations/` |
| Python скрипт в корне | `check_db.py` | Перенести в `scripts/utils/` |
| Аналитика в корне | `AI_STACK_ANALYSIS.md`, `LOGS_ANALYSIS.md` | Перенести в `docs/analysis/` |
| Пробел в имени директории | `docs/rag analysis/` | Переименовать в `docs/analysis/rag-analysis/` |
| Эмодзи в именах файлов | `🚀Использование.md`, `🤖 AI Stack.md` | Переименовать |
| Пустой CONTRIBUTING.md | 0 байт | ✅ Заполнено |
| Неполный .gitignore | 1 строка | ✅ Расширено |
| Артефакты в README | "Следующие шаги" | ✅ Удалено |

---

## Предлагаемые изменения

### 1. Перенос SQL миграций

#### [MOVE] SQL файлы из корня

```
create_match_documents_function.sql  →  deployments/docker/supabase/migrations/001_create_match_documents.sql
create_match_function.sql            →  deployments/docker/supabase/migrations/002_create_match_function.sql
fix_match_documents.sql              →  deployments/docker/supabase/migrations/003_fix_match_documents.sql
fix_match_documents_types.sql        →  deployments/docker/supabase/migrations/004_fix_match_documents_types.sql
```

---

### 2. Перенос Python скриптов

#### [MOVE] check_db.py

```
check_db.py  →  scripts/utils/check_db.py
```

> [!NOTE]
> Файл уже создан с улучшениями (type hints, docstrings, защита от SQL-инъекций)

---

### 3. Реорганизация документации

#### [MOVE] Аналитические файлы

```
AI_STACK_ANALYSIS.md  →  docs/analysis/ai-stack-analysis.md
LOGS_ANALYSIS.md      →  docs/analysis/logs-analysis.md
```

#### [MOVE] RAG-анализ

```
docs/rag analysis/AI_Local_Agent_Llamaindex_Analysis.md  →  docs/analysis/rag-analysis/llamaindex-analysis.md
docs/rag analysis/AI_Local_Agent_Supabase_Analysis.md    →  docs/analysis/rag-analysis/supabase-analysis.md
docs/rag analysis/AI_RAG_Agent_Recommendations.md        →  docs/analysis/rag-analysis/recommendations.md
```

#### [RENAME] Файлы с эмодзи

```
docs/🚀Использование.md  →  docs/usage.md
docs/🤖 AI Stack.md      →  docs/ai-stack-overview.md
```

---

### 4. Удаление дубликатов

После успешного переноса удалить:
- `check_db.py` (корень)
- `*.sql` (4 файла в корне)
- `AI_STACK_ANALYSIS.md` (корень)
- `LOGS_ANALYSIS.md` (корень)
- `docs/rag analysis/` (пустая директория после переноса)

---

## Уже выполнено ✅

1. **Обновлён `.gitignore`** — добавлены паттерны для Python, Docker, IDE, secrets
2. **Заполнен `CONTRIBUTING.md`** — инструкции для контрибьюторов
3. **Очищен `README.md`** — удалена секция "Следующие шаги"
4. **Создан `tests/README.md`** — описание структуры тестов
5. **Создан `docs/analysis/README.md`** — индекс аналитических документов
6. **Создан `scripts/utils/check_db.py`** — улучшенная версия скрипта
7. **Создан `deployments/docker/supabase/migrations/001_create_match_function.sql`** — первая миграция

---

## Команды для выполнения

```bash
# 1. Создать директории
mkdir -p docs/analysis/rag-analysis
mkdir -p deployments/docker/supabase/migrations

# 2. Перенести SQL файлы
mv create_match_documents_function.sql deployments/docker/supabase/migrations/001_create_match_documents.sql
mv create_match_function.sql deployments/docker/supabase/migrations/002_create_match_function.sql
mv fix_match_documents.sql deployments/docker/supabase/migrations/003_fix_match_documents.sql
mv fix_match_documents_types.sql deployments/docker/supabase/migrations/004_fix_match_documents_types.sql

# 3. Перенести аналитику
mv AI_STACK_ANALYSIS.md docs/analysis/ai-stack-analysis.md
mv LOGS_ANALYSIS.md docs/analysis/logs-analysis.md

# 4. Перенести RAG-анализ
mv "docs/rag analysis/AI_Local_Agent_Llamaindex_Analysis.md" docs/analysis/rag-analysis/llamaindex-analysis.md
mv "docs/rag analysis/AI_Local_Agent_Supabase_Analysis.md" docs/analysis/rag-analysis/supabase-analysis.md
mv "docs/rag analysis/AI_RAG_Agent_Recommendations.md" docs/analysis/rag-analysis/recommendations.md
rmdir "docs/rag analysis"

# 5. Переименовать файлы с эмодзи
mv "docs/🚀Использование.md" docs/usage.md
mv "docs/🤖 AI Stack.md" docs/ai-stack-overview.md

# 6. Удалить старый check_db.py
rm check_db.py
```

---

## Итоговая структура

```
ai-ass-core/
├── apps/                           # Приложения
├── configs/                        # Конфигурации
├── deployments/
│   └── docker/
│       └── supabase/
│           └── migrations/         # ← SQL миграции
│               ├── 001_create_match_documents.sql
│               ├── 002_create_match_function.sql
│               ├── 003_fix_match_documents.sql
│               └── 004_fix_match_documents_types.sql
├── docs/
│   ├── analysis/                   # ← Аналитика
│   │   ├── README.md
│   │   ├── ai-stack-analysis.md
│   │   ├── logs-analysis.md
│   │   └── rag-analysis/           # ← RAG анализ
│   │       ├── llamaindex-analysis.md
│   │       ├── supabase-analysis.md
│   │       └── recommendations.md
│   ├── architecture/
│   ├── operations/
│   ├── security/
│   ├── setup/
│   ├── ai-stack-overview.md        # ← Переименовано
│   └── usage.md                    # ← Переименовано
├── scripts/
│   ├── utils/
│   │   └── check_db.py             # ← Перенесено
│   └── ...
├── tests/
│   └── README.md                   # ← Добавлено
├── .gitignore                      # ← Обновлено
├── CONTRIBUTING.md                 # ← Заполнено
├── Makefile
└── README.md                       # ← Очищено
```

---

## Verification Plan

### Проверка после выполнения

1. **Структура файлов:**
   ```bash
   find . -name "*.sql" -not -path "./deployments/*"  # Должно быть пусто
   ls docs/analysis/rag-analysis/  # 3 файла
   ls deployments/docker/supabase/migrations/  # 4+ SQL файлов
   ```

2. **Отсутствие файлов в корне:**
   ```bash
   ls *.sql  # Должна быть ошибка "No such file"
   ls check_db.py  # Должна быть ошибка
   ```

3. **Git status:**
   ```bash
   git status  # Проверить что все изменения tracked
   ```
