# Настройка Гибридного Поиска в Supabase (PostgreSQL)

Этот документ описывает процесс создания таблицы для хранения векторов и документов, а также настройку функции гибридного поиска (Hybrid Search), объединяющей векторный поиск (Semantic Search) и полнотекстовый поиск (Full-Text Search) с использованием алгоритма RRF (Reciprocal Rank Fusion).

## 1. Подготовка окружения

В первую очередь необходимо включить расширение `pgvector` для работы с векторами.

```sql
-- Включаем расширение pgvector
CREATE EXTENSION IF NOT EXISTS vector;
```

## 2. Создание таблицы

Создадим таблицу `documents` (или любую другую, например `data_llamaindex_vectors`), которая будет хранить текстовый контент, метаданные и векторные представления.

> **Примечание:** Размерность вектора `1536` указана для моделей OpenAI (text-embedding-3-small/large). Если вы используете локальные модели (например, `nomic-embed-text` или `multilingual-e5`), измените это значение на соответствующее (например, `768` или `1024`).

```sql
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT,             -- Текст документа
  metadata JSONB,           -- Метаданные (источник, автор, дата и т.д.)
  embedding VECTOR(1536)    -- Векторное представление текста
);
```

## 3. Настройка Полнотекстового Поиска (FTS)

Для эффективного поиска по ключевым словам добавим вычисляемую колонку `fts` типа `tsvector` и индекс GIN. Мы используем конфигурацию `russian` для поддержки русского языка (стемминг, стоп-слова).

```sql
-- Добавляем автоматически обновляемую колонку для полнотекстового поиска
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS fts tsvector GENERATED ALWAYS AS (to_tsvector('russian', content)) STORED;

-- Создаем GIN индекс для быстрого текстового поиска
CREATE INDEX IF NOT EXISTS idx_documents_fts ON documents USING GIN (fts);
```

## 4. Настройка Векторного Индекса

Для ускорения поиска по ближайшим соседям (ANN) создадим индекс HNSW.

```sql
-- Создаем HNSW индекс для векторного поиска (cosine distance)
CREATE INDEX IF NOT EXISTS idx_documents_embedding 
ON documents USING HNSW (embedding vector_cosine_ops);
```

## 5. Функция Гибридного Поиска (RRF)

Создадим RPC-функцию, которую можно вызывать из API Supabase. Она выполняет два поиска параллельно и объединяет результаты.

**Параметры:**
*   `query_text`: Текстовый запрос для поиска по ключевым словам.
*   `query_embedding`: Вектор запроса для семантического поиска.
*   `match_count`: Количество возвращаемых результатов.
*   `rrf_k`: Константа сглаживания ранжирования (обычно 60).

```sql
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text text,
  query_embedding vector(1536), -- УБЕДИТЕСЬ, ЧТО РАЗМЕРНОСТЬ СОВПАДАЕТ
  match_count int,
  full_text_weight float default 1,
  semantic_weight float default 1,
  rrf_k int default 60
)
RETURNS SETOF documents
LANGUAGE sql
AS $$
WITH full_text AS (
  SELECT
    id,
    ROW_NUMBER() OVER(ORDER BY ts_rank_cd(fts, websearch_to_tsquery('russian', query_text)) DESC) AS rank_ix
  FROM
    documents
  WHERE
    fts @@ websearch_to_tsquery('russian', query_text)
  LIMIT match_count * 2 -- Берем с запасом для пересечения
),
semantic AS (
  SELECT
    id,
    ROW_NUMBER() OVER(ORDER BY embedding <=> query_embedding) AS rank_ix
  FROM
    documents
  ORDER BY
    embedding <=> query_embedding
  LIMIT match_count * 2
)
SELECT
  documents.*
FROM
  full_text
FULL OUTER JOIN semantic ON full_text.id = semantic.id
JOIN documents ON COALESCE(full_text.id, semantic.id) = documents.id
ORDER BY
  COALESCE(1.0 / (rrf_k + full_text.rank_ix), 0.0) * full_text_weight +
  COALESCE(1.0 / (rrf_k + semantic.rank_ix), 0.0) * semantic_weight
DESC
LIMIT match_count;
$$;
```

## 6. Пример использования (JavaScript / Supabase SDK)

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('SUPABASE_URL', 'SUPABASE_KEY')

async function searchData(userQuery) {
  // 1. Получаем эмбеддинг для запроса (используя OpenAI или локальную модель)
  const embedding = await generateEmbedding(userQuery); 

  // 2. Вызываем функцию гибридного поиска
  const { data, error } = await supabase.rpc('hybrid_search', {
    query_text: userQuery,
    query_embedding: embedding,
    match_count: 5
  });

  if (error) {
    console.error('Ошибка поиска:', error);
    return [];
  }

  return data;
}
```
