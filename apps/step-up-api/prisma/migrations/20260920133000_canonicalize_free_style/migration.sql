-- Canonicalize free-text dance style names that mention "free" to "Free Style".

UPDATE "Batch" AS b
SET "danceCategories" = sub.normalized
FROM (
  SELECT
    id,
    jsonb_agg(
      CASE
        WHEN COALESCE(elem->>'name', '') ~* '\mfree\M'
          OR lower(COALESCE(elem->>'name', '')) LIKE '%freestyle%'
        THEN jsonb_set(elem, '{name}', '"Free Style"')
        ELSE elem
      END
      ORDER BY ord
    ) AS normalized
  FROM "Batch",
    jsonb_array_elements(COALESCE("danceCategories", '[]'::jsonb))
      WITH ORDINALITY AS t(elem, ord)
  WHERE jsonb_typeof("danceCategories") = 'array'
  GROUP BY id
) AS sub
WHERE b.id = sub.id
  AND b."danceCategories"::text ~* 'free';

UPDATE "StudioSettings" AS s
SET "danceStyles" = sub.normalized
FROM (
  SELECT
    "studioId",
    jsonb_agg(
      CASE
        WHEN COALESCE(elem->>'label', '') ~* '\mfree\M'
          OR lower(COALESCE(elem->>'label', '')) LIKE '%freestyle%'
        THEN jsonb_set(elem, '{label}', '"Free Style"')
        ELSE elem
      END
      ORDER BY ord
    ) AS normalized
  FROM "StudioSettings",
    jsonb_array_elements(COALESCE("danceStyles", '[]'::jsonb))
      WITH ORDINALITY AS t(elem, ord)
  WHERE jsonb_typeof("danceStyles") = 'array'
  GROUP BY "studioId"
) AS sub
WHERE s."studioId" = sub."studioId"
  AND s."danceStyles"::text ~* 'free';

UPDATE "User" AS u
SET styles = (
  SELECT COALESCE(
    ARRAY(
      SELECT DISTINCT ON (lower(normalized)) normalized
      FROM (
        SELECT
          CASE
            WHEN s ~* '\mfree\M' OR lower(s) LIKE '%freestyle%' THEN 'Free Style'
            ELSE s
          END AS normalized,
          idx
        FROM unnest(u.styles) WITH ORDINALITY AS t(s, idx)
      ) rewritten
      ORDER BY lower(normalized), idx
    ),
    ARRAY[]::text[]
  )
)
WHERE EXISTS (
  SELECT 1
  FROM unnest(u.styles) AS s
  WHERE s ~* '\mfree\M' OR lower(s) LIKE '%freestyle%'
);

UPDATE "ContestCategory"
SET "danceStyle" = 'Free Style'
WHERE "danceStyle" ~* '\mfree\M'
  OR lower("danceStyle") LIKE '%freestyle%';
