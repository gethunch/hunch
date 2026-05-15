-- Avatar storage bucket. Public read, owner-write keyed on the path's first
-- folder segment (= user id).
--
-- This is a one-off setup, not a Drizzle-managed table — included alongside
-- the app migrations so deploying a fresh environment is reproducible.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public avatar reads" ON storage.objects;
DROP POLICY IF EXISTS "Avatar uploads by owner" ON storage.objects;
DROP POLICY IF EXISTS "Avatar updates by owner" ON storage.objects;
DROP POLICY IF EXISTS "Avatar deletes by owner" ON storage.objects;

CREATE POLICY "Public avatar reads"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Avatar uploads by owner"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

CREATE POLICY "Avatar updates by owner"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

CREATE POLICY "Avatar deletes by owner"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );
