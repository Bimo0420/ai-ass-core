-- Удаляем старую функцию
DROP FUNCTION IF EXISTS public.match_documents(jsonb, int, vector);

-- Создаем функцию с явным приведением типов
CREATE OR REPLACE FUNCTION public.match_documents(
  filter jsonb DEFAULT '{}'::jsonb,
  match_count int DEFAULT 5,
  query_embedding vector(768) DEFAULT NULL
)
RETURNS TABLE (
  id text,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    data_llamaindex_vectors.id::text,
    data_llamaindex_vectors.text::text AS content,
    data_llamaindex_vectors.metadata_::jsonb,
    (1 - (data_llamaindex_vectors.embedding <=> query_embedding))::double precision AS similarity
  FROM public.data_llamaindex_vectors
  WHERE query_embedding IS NOT NULL
  ORDER BY data_llamaindex_vectors.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
