-- RLS 활성화
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Allow insert" ON consultations;
DROP POLICY IF EXISTS "Allow select" ON consultations;
DROP POLICY IF EXISTS "Block update" ON consultations;
DROP POLICY IF EXISTS "Block delete" ON consultations;

-- 새 정책 생성
CREATE POLICY "Allow insert" ON consultations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select" ON consultations FOR SELECT USING (true);
CREATE POLICY "Block update" ON consultations FOR UPDATE USING (false);
CREATE POLICY "Block delete" ON consultations FOR DELETE USING (false);