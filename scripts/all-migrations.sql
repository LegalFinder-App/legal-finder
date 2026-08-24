-- >>> 20260730110814_95636d7c-d49e-4c9f-b7f1-379065a5d927.sql
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('user','lawyer','police','judiciary','admin');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  country TEXT DEFAULT 'Uganda',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_own_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_own_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "roles_read_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email, NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'user'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ LAWYERS ============
CREATE TABLE public.lawyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  headline TEXT,
  bio TEXT,
  firm TEXT,
  photo_url TEXT,
  email TEXT,
  phone TEXT,
  county TEXT,
  city TEXT,
  practice_areas TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT '{}',
  years_experience INT NOT NULL DEFAULT 0,
  hourly_rate NUMERIC(10,2),
  consultation_fee NUMERIC(10,2),
  bar_number TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  accepting_clients BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lawyers TO authenticated;
GRANT SELECT ON public.lawyers TO anon;
GRANT ALL ON public.lawyers TO service_role;
ALTER TABLE public.lawyers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lawyers_public_read" ON public.lawyers FOR SELECT USING (true);
CREATE POLICY "lawyers_self_manage" ON public.lawyers FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_lawyers_updated BEFORE UPDATE ON public.lawyers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID NOT NULL REFERENCES public.lawyers(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'Client',
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lawyer_id, author_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_own_write" ON public.reviews FOR ALL TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (author_id = auth.uid());

CREATE OR REPLACE FUNCTION public.refresh_lawyer_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lid UUID;
BEGIN
  lid := COALESCE(NEW.lawyer_id, OLD.lawyer_id);
  UPDATE public.lawyers l SET
    rating = COALESCE((SELECT ROUND(AVG(rating)::numeric,2) FROM public.reviews WHERE lawyer_id = lid),0),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE lawyer_id = lid)
  WHERE l.id = lid;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_reviews_rating AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_lawyer_rating();

-- ============ CASES ============
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL DEFAULT ('LF-' || upper(substr(md5(random()::text),1,8))),
  title TEXT NOT NULL,
  description TEXT,
  case_type TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lawyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  court TEXT,
  next_hearing TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO authenticated;
GRANT ALL ON public.cases TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cases_participants_read" ON public.cases FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR lawyer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cases_client_insert" ON public.cases FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid());
CREATE POLICY "cases_participants_update" ON public.cases FOR UPDATE TO authenticated
  USING (client_id = auth.uid() OR lawyer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cases_owner_delete" ON public.cases FOR DELETE TO authenticated
  USING (client_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_cases_updated BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.case_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.case_updates TO authenticated;
GRANT ALL ON public.case_updates TO service_role;
ALTER TABLE public.case_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "case_updates_read" ON public.case_updates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND (c.client_id = auth.uid() OR c.lawyer_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "case_updates_insert" ON public.case_updates FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND (c.client_id = auth.uid() OR c.lawyer_id = auth.uid())));
CREATE POLICY "case_updates_delete" ON public.case_updates FOR DELETE TO authenticated USING (author_id = auth.uid());

-- ============ APPOINTMENTS ============
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lawyer_name TEXT,
  client_name TEXT,
  subject TEXT NOT NULL,
  notes TEXT,
  mode TEXT NOT NULL DEFAULT 'video',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 45,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appts_read" ON public.appointments FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR lawyer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "appts_insert" ON public.appointments FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid());
CREATE POLICY "appts_update" ON public.appointments FOR UPDATE TO authenticated
  USING (client_id = auth.uid() OR lawyer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "appts_delete" ON public.appointments FOR DELETE TO authenticated
  USING (client_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_appts_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MESSAGING ============
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (participant_a, participant_b)
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_read" ON public.conversations FOR SELECT TO authenticated
  USING (participant_a = auth.uid() OR participant_b = auth.uid());
CREATE POLICY "conv_insert" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (participant_a = auth.uid() OR participant_b = auth.uid());
CREATE POLICY "conv_update" ON public.conversations FOR UPDATE TO authenticated
  USING (participant_a = auth.uid() OR participant_b = auth.uid());

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_read" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())));
CREATE POLICY "msg_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())));
CREATE POLICY "msg_update" ON public.messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())));
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============ DOCUMENTS ============
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docs_own" ON public.documents FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  kind TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own" ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ CONTENT: ADVICE / NEWS / QUOTES / TIPS / LIBRARY ============
CREATE TABLE public.legal_advices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  category TEXT NOT NULL DEFAULT 'General',
  summary TEXT,
  body TEXT NOT NULL,
  image_url TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_advices TO authenticated;
GRANT SELECT ON public.legal_advices TO anon;
GRANT ALL ON public.legal_advices TO service_role;
ALTER TABLE public.legal_advices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advice_read" ON public.legal_advices FOR SELECT USING (published OR author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "advice_write" ON public.legal_advices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lawyer'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'lawyer'));
CREATE TRIGGER trg_advice_updated BEFORE UPDATE ON public.legal_advices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  summary TEXT,
  body TEXT NOT NULL,
  image_url TEXT,
  source TEXT,
  author_name TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_posts TO authenticated;
GRANT SELECT ON public.news_posts TO anon;
GRANT ALL ON public.news_posts TO service_role;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "news_read" ON public.news_posts FOR SELECT USING (published OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "news_write" ON public.news_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT SELECT ON public.quotes TO anon;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes_read" ON public.quotes FOR SELECT USING (true);
CREATE POLICY "quotes_write" ON public.quotes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.security_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_tips TO authenticated;
GRANT SELECT ON public.security_tips TO anon;
GRANT ALL ON public.security_tips TO service_role;
ALTER TABLE public.security_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tips_read" ON public.security_tips FOR SELECT USING (true);
CREATE POLICY "tips_write" ON public.security_tips FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'police'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'police'));

CREATE TABLE public.library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  category TEXT NOT NULL DEFAULT 'Statute',
  description TEXT,
  cover_url TEXT,
  file_url TEXT,
  year INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_items TO authenticated;
GRANT SELECT ON public.library_items TO anon;
GRANT ALL ON public.library_items TO service_role;
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "library_read" ON public.library_items FOR SELECT USING (true);
CREATE POLICY "library_write" ON public.library_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ JUDICIARY ============
CREATE TABLE public.judgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT NOT NULL,
  title TEXT NOT NULL,
  court TEXT NOT NULL,
  judge TEXT,
  summary TEXT,
  body TEXT,
  file_url TEXT,
  decided_on DATE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.judgements TO authenticated;
GRANT SELECT ON public.judgements TO anon;
GRANT ALL ON public.judgements TO service_role;
ALTER TABLE public.judgements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "judg_read" ON public.judgements FOR SELECT USING (published OR uploaded_by = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "judg_write" ON public.judgements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'judiciary') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'judiciary') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_judg_updated BEFORE UPDATE ON public.judgements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ POLICE ============
CREATE TABLE public.police_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  county TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.police_stations TO authenticated;
GRANT SELECT ON public.police_stations TO anon;
GRANT ALL ON public.police_stations TO service_role;
ALTER TABLE public.police_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stations_read" ON public.police_stations FOR SELECT USING (true);
CREATE POLICY "stations_write" ON public.police_stations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'police'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'police'));

CREATE TABLE public.wanted_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  alias TEXT,
  description TEXT,
  offence TEXT,
  last_seen TEXT,
  photo_url TEXT,
  reward NUMERIC(12,2),
  danger_level TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'wanted',
  posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wanted_persons TO authenticated;
GRANT SELECT ON public.wanted_persons TO anon;
GRANT ALL ON public.wanted_persons TO service_role;
ALTER TABLE public.wanted_persons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wanted_read" ON public.wanted_persons FOR SELECT USING (true);
CREATE POLICY "wanted_write" ON public.wanted_persons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_wanted_updated BEFORE UPDATE ON public.wanted_persons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL DEFAULT ('IR-' || upper(substr(md5(random()::text),1,8))),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_name TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  description TEXT NOT NULL,
  location TEXT,
  occurred_at TIMESTAMPTZ,
  anonymous BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'submitted',
  officer_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_reports TO authenticated;
GRANT ALL ON public.incident_reports TO service_role;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incident_read" ON public.incident_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "incident_insert" ON public.incident_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "incident_update" ON public.incident_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_incident_updated BEFORE UPDATE ON public.incident_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cases_client ON public.cases(client_id);
CREATE INDEX idx_cases_lawyer ON public.cases(lawyer_id);
CREATE INDEX idx_msg_conv ON public.messages(conversation_id, created_at);
CREATE INDEX idx_appts_lawyer ON public.appointments(lawyer_id, scheduled_at);
CREATE INDEX idx_lawyers_areas ON public.lawyers USING GIN (practice_areas);

-- >>> 20260730110836_a830f636-ec27-4e0e-97fc-7d96db9eaf24.sql
DROP POLICY IF EXISTS "roles_read_own" ON public.user_roles;
CREATE POLICY "roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_lawyer_rating() FROM PUBLIC, anon, authenticated;

-- >>> 20260730110904_d2020f69-5b8e-47ff-85e0-afa2972da19b.sql
CREATE POLICY "docs_own_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "docs_own_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "docs_own_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "docs_own_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "media_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'media');
CREATE POLICY "media_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "media_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "media_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- >>> 20260730111043_1217c1b3-b3bf-460f-a520-1e9407682733.sql
INSERT INTO public.lawyers (full_name, headline, bio, firm, county, city, practice_areas, languages, years_experience, hourly_rate, consultation_fee, bar_number, verified, rating, review_count, email, phone) VALUES
('Amara Otieno','Senior Advocate — Constitutional & Human Rights','Amara has litigated landmark constitutional petitions before the Supreme Court and advises civil-society organisations on rights-based strategy.','Otieno & Mwangi Advocates LLP','Nairobi','Nairobi','{Constitutional Law,Human Rights,Public Interest}','{English,Swahili}',16,180,45,'LSK/2009/4412',true,4.90,42,'amara@otienomwangi.co.ke','+254 700 100 201'),
('David Kimani','Commercial & Corporate Counsel','Advises fast-growing companies on financing, M&A and cross-border commercial contracts.','Kimani Partners','Nairobi','Westlands','{Corporate Law,Mergers & Acquisitions,Contracts}','{English,Swahili}',12,220,60,'LSK/2013/8871',true,4.70,31,'d.kimani@kimanipartners.co.ke','+254 700 100 202'),
('Fatuma Hassan','Family Law & Child Protection Specialist','Fatuma represents parents and guardians in custody, succession and matrimonial property disputes with a trauma-informed approach.','Hassan Legal','Mombasa','Mombasa','{Family Law,Succession,Child Protection}','{English,Swahili,Arabic}',10,120,30,'LSK/2015/2298',true,4.80,58,'fatuma@hassanlegal.co.ke','+254 700 100 203'),
('Peter Wanyama','Criminal Defence Advocate','Trial advocate with a strong record in serious criminal defence and bail applications across the High Court.','Wanyama & Co. Advocates','Kisumu','Kisumu','{Criminal Defence,Bail Applications,Appeals}','{English,Swahili,Luo}',18,150,35,'LSK/2007/1140',true,4.60,27,'peter@wanyamaco.co.ke','+254 700 100 204'),
('Grace Njeri','Employment & Labour Law','Grace acts for both employees and employers in unfair-dismissal claims, redundancy and workplace investigations.','Njeri Advocates','Nakuru','Nakuru','{Employment Law,Labour Disputes,HR Compliance}','{English,Swahili,Kikuyu}',9,110,25,'LSK/2016/6603',true,4.75,36,'grace@njeriadvocates.co.ke','+254 700 100 205'),
('Samuel Barasa','Land, Property & Conveyancing','Handles complex land succession, boundary disputes and commercial conveyancing across the Rift Valley.','Barasa & Associates','Eldoret','Eldoret','{Land Law,Conveyancing,Property Disputes}','{English,Swahili}',14,130,30,'LSK/2011/3357',true,4.50,19,'sbarasa@barasalaw.co.ke','+254 700 100 206'),
('Lucy Achieng','Immigration & Refugee Law','Lucy guides individuals and families through work permits, citizenship and asylum applications.','Achieng Immigration Law','Nairobi','Upper Hill','{Immigration,Refugee Law,Citizenship}','{English,Swahili,French}',8,140,35,'LSK/2017/9021',true,4.65,22,'lucy@achienglaw.co.ke','+254 700 100 207'),
('Brian Mutiso','Technology, Data & IP','Advises startups and platforms on data protection, licensing and intellectual property enforcement.','Mutiso Tech Law','Nairobi','Kilimani','{Data Protection,Intellectual Property,Technology}','{English,Swahili}',7,200,50,'LSK/2018/7712',true,4.85,15,'brian@mutisotech.co.ke','+254 700 100 208');

INSERT INTO public.legal_advices (title, slug, category, summary, body, author_name) VALUES
('What to do in the first hour after an arrest','first-hour-after-arrest','Criminal','Your rights at the police station and the five things you should never do.','The moments immediately after an arrest shape everything that follows. Article 49 of the Constitution guarantees that any arrested person must be informed promptly, in a language they understand, of the reason for the arrest and of the right to remain silent.

**1. Say less than you think you should.** You are not obliged to explain yourself at the roadside or the report desk. Anything volunteered can be recorded in the occurrence book and used later.

**2. Ask for the OB number.** Every arrest should be entered in the Occurrence Book. Ask for the number and pass it to a relative — it is the thread that lets a lawyer find you.

**3. Insist on contacting an advocate.** The right to communicate with an advocate is constitutional, not a favour.

**4. Do not sign anything you have not read.** Statements written by someone else and signed under pressure are the single most common cause of avoidable convictions.

**5. Remember the 24-hour rule.** An arrested person must be brought before a court no later than twenty-four hours after arrest, or on the next court day.','LegalFinder Editorial'),
('Understanding matrimonial property before you marry','matrimonial-property','Family','Who owns what, how contribution is measured, and why documentation matters.','Matrimonial property is property acquired by spouses during a marriage. It includes the matrimonial home, household goods and any other movable or immovable property jointly owned or acquired.

Contribution is both monetary and non-monetary. Domestic work, child care, companionship and management of the family business all count as contribution in law. Courts assess the whole picture, not just bank statements.

Keep records. Title documents, transfer instruments, receipts for improvements and evidence of loan repayments are the evidence that decides most disputes. A pre-nuptial agreement is enforceable where it was entered into freely, with full disclosure and independent advice.','LegalFinder Editorial'),
('Employment termination: fair reason and fair procedure','fair-termination','Employment','A dismissal must pass two tests. Most fail the second.','Every termination must satisfy two separate requirements: a valid and fair reason, and a fair procedure.

A valid reason relates to the employee''s conduct, capacity or compatibility, or to the operational requirements of the employer. A fair procedure requires that the employee be notified of the allegations in a language they understand, be given a hearing, be allowed a colleague or union representative, and receive reasons for the decision.

Where either test fails, the Employment and Labour Relations Court may award up to twelve months'' gross salary in compensation, plus terminal dues. Claims must generally be filed within three years.','LegalFinder Editorial'),
('Buying land safely: the eight searches you must run','buying-land-safely','Property','Due diligence steps that prevent the most expensive mistake of your life.','Before any deposit changes hands, complete these checks:

1. Official search at the land registry to confirm registered ownership and encumbrances.
2. Historical search to trace the chain of title.
3. Physical site visit with a licensed surveyor and the registry index map.
4. County land rates clearance certificate.
5. Land rent clearance for leasehold titles.
6. Confirmation of spousal or family consent where required.
7. Land Control Board consent for agricultural land.
8. Confirmation that the seller''s identity documents match the title.

Pay through an advocate''s client account, never in cash, and register the transfer immediately upon completion.','LegalFinder Editorial'),
('Your rights as a tenant when a landlord locks you out','tenant-lockout','Property','Distress for rent has rules. Self-help eviction is not one of them.','A landlord may not simply change the locks, disconnect utilities or throw out your property. Recovery of rent arrears must follow the statutory distress process, executed by a licensed auctioneer with a valid court order or proclamation.

If you have been locked out, photograph the premises, report the matter at the nearest police station and obtain an OB number, then apply to the Business Premises Rent Tribunal or the Environment and Land Court for reinstatement and damages.','LegalFinder Editorial'),
('Small claims: recovering money without a long trial','small-claims','Civil','The Small Claims Court decides disputes up to the statutory limit within sixty days.','The Small Claims Court was designed for speed. Proceedings are informal, representation by an advocate is optional, and the adjudicator is required to determine the claim within sixty days of filing.

Bring: your written agreement or invoices, proof of payment or delivery, correspondence demanding payment, and the respondent''s correct legal name and address. Judgments are enforceable in the same manner as those of the Magistrate''s Court.','LegalFinder Editorial');

INSERT INTO public.news_posts (title, slug, summary, body, source, author_name) VALUES
('Judiciary rolls out expanded e-filing across all court stations','e-filing-rollout','Litigants can now file, pay and track matters online in every registry nationwide.','The expansion completes a multi-year programme to digitise court registries. Filing fees are assessed automatically, documents are served electronically and case status is visible to parties in real time. Registrars report a measurable drop in adjournments caused by missing files.','Judiciary Communications','LegalFinder Desk'),
('Data protection enforcement steps up with new penalty guidelines','data-protection-penalties','Regulators publish a framework for calculating fines against data controllers and processors.','The guidelines set out aggravating and mitigating factors, including the sensitivity of the data, the number of data subjects affected, and the speed and transparency of breach notification. Organisations are advised to review their records of processing activities and appoint a data protection officer where thresholds are met.','Office of the Data Protection Commissioner','LegalFinder Desk'),
('Small Claims Courts clear record caseload in the last quarter','small-claims-record','Average time to judgment falls below the statutory sixty-day ceiling.','Increased adjudicator appointments and expanded sitting hours drove throughput. Legal aid clinics report that self-represented litigants now make up the majority of filings, underlining the importance of accessible plain-language guidance.','Judiciary Statistics Bulletin','LegalFinder Desk'),
('Legal aid scheme widens eligibility for vulnerable litigants','legal-aid-expansion','More categories of matter now qualify for state-funded representation.','The revised scheme covers children in conflict with the law, survivors of gender-based violence, persons with disabilities and indigent accused persons facing custodial sentences. Accredited advocates can now register through a single national portal.','National Legal Aid Service','LegalFinder Desk');

INSERT INTO public.quotes (text, author) VALUES
('Injustice anywhere is a threat to justice everywhere.','Martin Luther King Jr.'),
('The good lawyer is not the man who has an eye to every side and angle of contingency, but who throws himself on your part so heartily.','Ralph Waldo Emerson'),
('Justice delayed is justice denied.','William E. Gladstone'),
('Where law ends, tyranny begins.','William Pitt'),
('The first duty of society is justice.','Alexander Hamilton'),
('Law and order exist for the purpose of establishing justice.','Martin Luther King Jr.');

INSERT INTO public.security_tips (title, body, icon) VALUES
('Verify every advocate before you pay','Confirm the practising certificate number and firm details independently. Never send fees to a personal mobile-money number.','shield-check'),
('Keep an evidence timeline','Photograph documents, save messages and note dates as events happen. Reconstructed memories are weak evidence; contemporaneous notes are strong.','clock'),
('Report suspicious activity early','Delayed reporting weakens investigations. Obtain an OB number at the point of report and keep it safe.','siren'),
('Protect your personal data','Do not share identity documents over social media. Legitimate offices will never ask for your PIN or one-time password.','lock'),
('Know your emergency contacts','Save the nearest police station, a trusted relative and your advocate as favourites on your phone before you need them.','phone'),
('Read before you sign','Never sign a blank or partially completed document. Ask for a copy of everything you sign, at the moment you sign it.','file-signature');

INSERT INTO public.library_items (title, author, category, description, year) VALUES
('The Constitution','Republic of Kenya','Constitution','The supreme law, including the Bill of Rights and the structure of national and county government.',2010),
('Employment Act','National Assembly','Statute','Declares and defines the fundamental rights of employees and regulates terms of employment.',2007),
('Land Registration Act','National Assembly','Statute','Governs the registration of title to land and the recording of dealings in registered land.',2012),
('Evidence Act','National Assembly','Statute','Rules relating to the admissibility, relevance and weight of evidence in civil and criminal proceedings.',1963),
('Civil Procedure Rules','Rules Committee','Procedure','Procedural framework governing the conduct of civil suits, pleadings, discovery and appeals.',2010),
('Children Act','National Assembly','Statute','Provides for parental responsibility, care and protection of children and the administration of children''s institutions.',2022),
('Data Protection Act','National Assembly','Statute','Regulates the processing of personal data and establishes the rights of data subjects.',2019),
('Law of Succession Act','National Assembly','Statute','Governs testate and intestate succession and the administration of estates of deceased persons.',1972);

INSERT INTO public.judgements (case_number, title, court, judge, summary, decided_on) VALUES
('SCK/PET/12','Constitutional threshold for public participation in legislation','Supreme Court','Hon. Justice A. Wanjiku','The Court held that public participation must be meaningful and not a formality, setting out five indicators against which legislative processes will be assessed.','2024-11-14'),
('CA/CIV/238','Non-monetary contribution in matrimonial property','Court of Appeal','Hon. Justice P. Mureithi','The Court restated that non-monetary contribution is to be valued on the evidence and not by an automatic equal-share presumption.','2024-08-02'),
('HC/CRIM/91','Admissibility of digital evidence and chain of custody','High Court','Hon. Justice S. Odhiambo','Digital exhibits require a documented and unbroken chain of custody together with a certificate of electronic record to be admissible.','2025-01-23'),
('ELRC/45','Fair procedure in redundancy declarations','Employment & Labour Relations Court','Hon. Justice N. Kiptoo','Failure to issue the statutory notice to the employee and the labour officer rendered the redundancy unfair notwithstanding genuine operational grounds.','2024-06-19'),
('ELC/302','Adverse possession and continuous occupation','Environment & Land Court','Hon. Justice R. Chebet','Occupation must be open, peaceful and uninterrupted for the full statutory period; permissive occupation cannot ripen into title.','2025-03-08');

INSERT INTO public.police_stations (name, county, address, phone, email, latitude, longitude) VALUES
('Central Police Station','Nairobi','University Way, Nairobi CBD','+254 20 222 2222','central@police.go.ke',-1.283300,36.821900),
('Kilimani Police Station','Nairobi','Argwings Kodhek Road, Kilimani','+254 20 272 4154','kilimani@police.go.ke',-1.293100,36.786500),
('Central Police Station Mombasa','Mombasa','Makadara Road, Mombasa Island','+254 41 222 5501','mombasacentral@police.go.ke',-4.061900,39.669900),
('Kisumu Central Police Station','Kisumu','Oginga Odinga Street, Kisumu','+254 57 202 0202','kisumucentral@police.go.ke',-0.091700,34.767900),
('Nakuru Central Police Station','Nakuru','Kenyatta Avenue, Nakuru','+254 51 221 4141','nakurucentral@police.go.ke',-0.303100,36.080000),
('Eldoret Police Station','Uasin Gishu','Uganda Road, Eldoret','+254 53 206 3030','eldoret@police.go.ke',0.514300,35.269800);

INSERT INTO public.wanted_persons (name, alias, description, offence, last_seen, danger_level, status, reward) VALUES
('Unidentified suspect — Case OB 114/25','—','Male, approximately 30-35 years, medium build, scar above the left eyebrow. Sought in connection with a series of commercial burglaries.','Aggravated burglary','Industrial Area, Nairobi','high','wanted',200000),
('Unidentified suspect — Case OB 087/25','—','Male, approximately 25 years, slim build, last seen wearing a dark hooded jacket. Sought for questioning in a motor vehicle theft ring.','Motor vehicle theft','Kisumu Town','medium','wanted',100000),
('Unidentified suspect — Case OB 203/24','—','Female, approximately 40 years, sought in connection with a large-scale mobile-money fraud affecting over two hundred complainants.','Fraud and obtaining by false pretences','Mombasa Island','medium','wanted',150000);

-- >>> 20260730123000_add_audit_logs_and_push_subscriptions.sql
-- Audit trail and browser push support for LegalFinder.

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  actor_role TEXT,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  record_id UUID,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_actor_id_idx ON public.audit_logs (actor_id);
CREATE INDEX audit_logs_table_name_idx ON public.audit_logs (table_name);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_admin_read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth_secret TEXT NOT NULL,
  device_name TEXT,
  platform TEXT NOT NULL DEFAULT 'web',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions (user_id);
CREATE INDEX push_subscriptions_endpoint_idx ON public.push_subscriptions (endpoint);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscription_own" ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.record_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor_uuid UUID := auth.uid();
  actor_display_name TEXT := COALESCE(
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'full_name'), ''),
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'name'), ''),
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'email'), '')
  );
  actor_display_role TEXT := COALESCE(
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), ''),
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'requested_role'), '')
  );
  before_payload JSONB;
  after_payload JSONB;
  affected_record_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    before_payload := to_jsonb(OLD);
    affected_record_id := OLD.id;
  ELSE
    before_payload := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
    after_payload := to_jsonb(NEW);
    affected_record_id := NEW.id;
  END IF;

  INSERT INTO public.audit_logs (
    actor_id,
    actor_name,
    actor_role,
    table_name,
    action,
    record_id,
    before_data,
    after_data,
    metadata
  ) VALUES (
    actor_uuid,
    actor_display_name,
    actor_display_role,
    TG_TABLE_NAME,
    TG_OP,
    affected_record_id,
    before_payload,
    after_payload,
    jsonb_build_object('source', TG_TABLE_SCHEMA, 'table', TG_TABLE_NAME)
  );

  RETURN COALESCE(NEW, OLD);
END; $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_profiles') THEN
    CREATE TRIGGER trg_audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_user_roles') THEN
    CREATE TRIGGER trg_audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_cases') THEN
    CREATE TRIGGER trg_audit_cases AFTER INSERT OR UPDATE OR DELETE ON public.cases
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_case_updates') THEN
    CREATE TRIGGER trg_audit_case_updates AFTER INSERT OR UPDATE OR DELETE ON public.case_updates
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_appointments') THEN
    CREATE TRIGGER trg_audit_appointments AFTER INSERT OR UPDATE OR DELETE ON public.appointments
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_documents') THEN
    CREATE TRIGGER trg_audit_documents AFTER INSERT OR UPDATE OR DELETE ON public.documents
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_messages') THEN
    CREATE TRIGGER trg_audit_messages AFTER INSERT OR UPDATE OR DELETE ON public.messages
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_notifications') THEN
    CREATE TRIGGER trg_audit_notifications AFTER INSERT OR UPDATE OR DELETE ON public.notifications
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_incidents') THEN
    CREATE TRIGGER trg_audit_incidents AFTER INSERT OR UPDATE OR DELETE ON public.incident_reports
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
END $$;

-- >>> 20260730130000_storage_buckets_and_incident_reports.sql
-- Storage buckets for document vault and media uploads.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documents', 'documents', false, 52428800, NULL),
  ('media', 'media', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Allow anonymous incident reports (public safety surface).
GRANT INSERT ON public.incident_reports TO anon;

DROP POLICY IF EXISTS "incident_insert" ON public.incident_reports;

CREATE POLICY "incident_insert_auth" ON public.incident_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id IS NULL OR reporter_id = auth.uid());

CREATE POLICY "incident_insert_anon" ON public.incident_reports FOR INSERT TO anon
  WITH CHECK (reporter_id IS NULL AND anonymous = true);

-- >>> 20260730140000_production_hardening.sql
-- Production hardening: secure signup roles, realtime notifications, storage scoping.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS requested_role public.app_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  requested public.app_role;
BEGIN
  requested := NULLIF(NEW.raw_user_meta_data->>'requested_role', '')::public.app_role;

  INSERT INTO public.profiles (id, full_name, email, phone, requested_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    requested
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    requested_role = COALESCE(EXCLUDED.requested_role, public.profiles.requested_role);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;

DROP POLICY IF EXISTS "media_read" ON storage.objects;
CREATE POLICY "media_read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- >>> 20260824100000_localize_demo_data_for_uganda.sql
-- Localise the original demo content. These advocate entries and stock portraits
-- are illustrative only; publish real profiles only after Uganda Law Council
-- verification and consent to use each person's photograph.

ALTER TABLE public.profiles ALTER COLUMN country SET DEFAULT 'Uganda';

UPDATE public.lawyers
SET
  full_name = source.full_name,
  headline = source.headline,
  bio = source.bio,
  firm = source.firm,
  county = source.district,
  city = source.city,
  practice_areas = source.practice_areas,
  languages = source.languages,
  hourly_rate = source.hourly_rate,
  consultation_fee = source.consultation_fee,
  bar_number = source.bar_number,
  email = source.email,
  phone = source.phone,
  photo_url = source.photo_url
FROM (
  VALUES
    ('amara@otienomwangi.co.ke', 'Nabirye Kato', 'Constitutional & human rights advocate', 'Nabirye supports rights-based litigation and public-interest matters before Uganda''s courts.', 'Kato & Partners Advocates', 'Kampala Central', 'Kampala', ARRAY['Constitutional Law','Human Rights','Public Interest'], ARRAY['English','Luganda'], 350000, 150000, 'ULC-DEMO-001', 'nabirye.kato@example.com', '+256 700 100 201', '/images/profiles/amara.jpg'),
    ('d.kimani@kimanipartners.co.ke', 'Michael Okello', 'Commercial & corporate counsel', 'Michael advises growing businesses on contracts, company matters and regional trade.', 'Okello Commercial Advocates', 'Nakawa', 'Kampala', ARRAY['Corporate Law','Commercial Law','Contracts'], ARRAY['English','Luganda'], 450000, 200000, 'ULC-DEMO-002', 'michael.okello@example.com', '+256 700 100 202', '/images/profiles/david.jpg'),
    ('fatuma@hassanlegal.co.ke', 'Aisha Nambasa', 'Family law & child protection specialist', 'Aisha supports families in custody, succession and matrimonial-property matters.', 'Nambasa Legal Chambers', 'Jinja', 'Jinja', ARRAY['Family Law','Succession','Child Protection'], ARRAY['English','Luganda','Swahili'], 300000, 120000, 'ULC-DEMO-003', 'aisha.nambasa@example.com', '+256 700 100 203', '/images/profiles/fatuma.jpg'),
    ('peter@wanyamaco.co.ke', 'Isaac Ocen', 'Criminal defence advocate', 'Isaac represents clients in criminal proceedings, bail applications and appeals.', 'Ocen & Co. Advocates', 'Gulu', 'Gulu', ARRAY['Criminal Defence','Bail Applications','Appeals'], ARRAY['English','Luo'], 400000, 180000, 'ULC-DEMO-004', 'isaac.ocen@example.com', '+256 700 100 204', '/images/profiles/peter.jpg'),
    ('grace@njeriadvocates.co.ke', 'Sarah Atwine', 'Employment & labour law advocate', 'Sarah advises employees and employers on workplace disputes, contracts and compliance.', 'Atwine Advocates', 'Mbarara', 'Mbarara', ARRAY['Employment Law','Labour Disputes','HR Compliance'], ARRAY['English','Runyankole'], 280000, 110000, 'ULC-DEMO-005', 'sarah.atwine@example.com', '+256 700 100 205', '/images/profiles/grace.jpg'),
    ('sbarasa@barasalaw.co.ke', 'Daniel Mugisha', 'Land, property & conveyancing advocate', 'Daniel handles land transactions, estate planning and property disputes.', 'Mugisha & Associates', 'Kabarole', 'Fort Portal', ARRAY['Land Law','Conveyancing','Property Disputes'], ARRAY['English','Rutooro'], 330000, 130000, 'ULC-DEMO-006', 'daniel.mugisha@example.com', '+256 700 100 206', '/images/profiles/samuel.jpg'),
    ('lucy@achienglaw.co.ke', 'Brenda Nakato', 'Immigration & refugee law advocate', 'Brenda guides individuals and families through immigration, citizenship and refugee-law matters.', 'Nakato Immigration Law', 'Makindye', 'Kampala', ARRAY['Immigration','Refugee Law','Citizenship'], ARRAY['English','Luganda','French'], 320000, 140000, 'ULC-DEMO-007', 'brenda.nakato@example.com', '+256 700 100 207', '/images/profiles/lucy.jpg'),
    ('brian@mutisotech.co.ke', 'Joshua Ssemanda', 'Technology, data & IP advocate', 'Joshua advises organisations on data protection, licensing and intellectual-property issues.', 'Ssemanda Technology Law', 'Rubaga', 'Kampala', ARRAY['Data Protection','Intellectual Property','Technology'], ARRAY['English','Luganda'], 380000, 170000, 'ULC-DEMO-008', 'joshua.ssemanda@example.com', '+256 700 100 208', '/images/profiles/brian.jpg')
) AS source(old_email, full_name, headline, bio, firm, district, city, practice_areas, languages, hourly_rate, consultation_fee, bar_number, email, phone, photo_url)
WHERE public.lawyers.email = source.old_email;

UPDATE public.library_items
SET author = 'Republic of Uganda',
    description = 'The supreme law of Uganda, including the Bill of Rights and the structure of government.'
WHERE title = 'The Constitution' AND author = 'Republic of Kenya';

UPDATE public.library_items
SET
  title = source.title,
  author = source.author,
  category = source.category,
  description = source.description,
  year = source.year
FROM (
  VALUES
    ('Employment Act', 'Employment Act, 2006', 'Parliament of Uganda', 'Statute', 'Regulates employment relationships, rights and obligations in Uganda.', 2006),
    ('Land Registration Act', 'Land Act, 1998', 'Parliament of Uganda', 'Statute', 'Provides for land tenure, land administration and related rights in Uganda.', 1998),
    ('Evidence Act', 'Evidence Act', 'Parliament of Uganda', 'Statute', 'Sets rules on the admissibility and proof of evidence in court proceedings.', 1909),
    ('Civil Procedure Rules', 'Civil Procedure Rules', 'Rules Committee', 'Procedure', 'Procedural framework for civil proceedings in Uganda.', 1971),
    ('Children Act', 'Children Act', 'Parliament of Uganda', 'Statute', 'Provides for the care, protection and welfare of children.', 1997),
    ('Data Protection Act', 'Data Protection and Privacy Act, 2019', 'Parliament of Uganda', 'Statute', 'Regulates the collection and processing of personal data and establishes data-subject rights.', 2019),
    ('Law of Succession Act', 'Succession Act', 'Parliament of Uganda', 'Statute', 'Governs estates, wills and the administration of deceased persons'' property.', 1906)
) AS source(old_title, title, author, category, description, year)
WHERE public.library_items.title = source.old_title;

UPDATE public.legal_advices
SET
  title = source.title,
  category = source.category,
  summary = source.summary,
  body = source.body
FROM (
  VALUES
    ('first-hour-after-arrest', 'What to do after an arrest in Uganda', 'Criminal', 'Practical first steps and safeguards after an arrest.', 'Stay calm and ask why you are being arrested. Tell a trusted person where you are and ask to contact a lawyer. Under Article 23 of the Constitution, a person arrested or detained on suspicion of a criminal offence must be brought before a court as soon as possible and not later than forty-eight hours from arrest. Do not sign a statement you do not understand. This guide is general information, not legal advice.'),
    ('matrimonial-property', 'Understanding family property in Uganda', 'Family', 'Why records, independent advice and the facts of each case matter.', 'Family-property questions depend on the facts, the type of property, contributions and the applicable law. Keep records of payments, agreements, titles and communications. Get advice from a qualified Ugandan advocate before signing an agreement or starting a court process.'),
    ('fair-termination', 'Employment termination: fair process in Uganda', 'Employment', 'Questions to consider if an employment relationship is ending.', 'Keep copies of your contract, notices, payslips and correspondence. The Employment Act, 2006 regulates employment rights and obligations. A lawyer or labour officer can assess the facts of a particular dismissal, including notice, procedure and outstanding payments.'),
    ('buying-land-safely', 'Buying land safely in Uganda', 'Property', 'Due diligence steps before you pay for land.', 'Confirm the seller''s identity and authority to sell. Carry out an official search and inspect the land in person. Uganda recognises customary, freehold, mailo and leasehold tenure, so obtain advice appropriate to the tenure and location. Do not rely on informal assurances; use written documents and an independent advocate.'),
    ('tenant-lockout', 'When a landlord threatens eviction', 'Property', 'Document what happens and seek prompt, local legal advice.', 'Do not use force or escalate a dispute. Keep your tenancy agreement, receipts and photographs, and record the dates and people involved. Consider reporting a crime to the police where appropriate and obtain advice from a qualified advocate about the remedies available on your facts.'),
    ('small-claims', 'Small claims in Uganda', 'Civil', 'A simpler court procedure for qualifying civil and commercial claims.', 'Uganda''s Small Claims Procedure Rules, 2011 cover qualifying claims of up to UGX 10,000,000. Prepare the documents that support your claim, identify the correct defendant and ask the court clerk or a legal assistant to explain the procedure. Check the current rules and obtain legal advice if your matter is complex.')
) AS source(slug, title, category, summary, body)
WHERE public.legal_advices.slug = source.slug;

UPDATE public.police_stations
SET
  name = source.name,
  county = source.district,
  address = source.address,
  phone = source.phone,
  email = source.email,
  latitude = source.latitude,
  longitude = source.longitude
FROM (
  VALUES
    ('central@police.go.ke', 'Central Police Station', 'Kampala Central', 'Kampala Road, Kampala', '+256 414 222 222', 'central@upf.go.ug', 0.313600, 32.581100),
    ('kilimani@police.go.ke', 'Jinja Road Police Station', 'Nakawa', 'Jinja Road, Kampala', '+256 414 222 223', 'jinjaroad@upf.go.ug', 0.322700, 32.603400),
    ('mombasacentral@police.go.ke', 'Jinja Central Police Station', 'Jinja', 'Main Street, Jinja', '+256 434 120 000', 'jinja@upf.go.ug', 0.424400, 33.204100),
    ('kisumucentral@police.go.ke', 'Gulu Central Police Station', 'Gulu', 'Gulu Town', '+256 471 432 000', 'gulu@upf.go.ug', 2.774600, 32.298900),
    ('nakurucentral@police.go.ke', 'Mbarara Central Police Station', 'Mbarara', 'High Street, Mbarara', '+256 485 420 000', 'mbarara@upf.go.ug', -0.607200, 30.654500),
    ('eldoret@police.go.ke', 'Fort Portal Police Station', 'Kabarole', 'Lugard Road, Fort Portal', '+256 483 420 000', 'fortportal@upf.go.ug', 0.671000, 30.275000)
) AS source(old_email, name, district, address, phone, email, latitude, longitude)
WHERE public.police_stations.email = source.old_email;

UPDATE public.wanted_persons
SET status = 'removed'
WHERE name LIKE 'Unidentified suspect%';

UPDATE public.judgements
SET
  court = source.court,
  title = source.title,
  summary = source.summary
FROM (
  VALUES
    ('SCK/PET/12', 'Supreme Court of Uganda', 'Public participation in legislation', 'Illustrative entry: verify the official decision and full citation on ULII before relying on it.'),
    ('CA/CIV/238', 'Court of Appeal of Uganda', 'Property contributions in family disputes', 'Illustrative entry: verify the official decision and full citation on ULII before relying on it.'),
    ('HC/CRIM/91', 'High Court of Uganda', 'Digital evidence and chain of custody', 'Illustrative entry: verify the official decision and full citation on ULII before relying on it.'),
    ('ELRC/45', 'Industrial Court of Uganda', 'Employment procedure in redundancy matters', 'Illustrative entry: verify the official decision and full citation on ULII before relying on it.'),
    ('ELC/302', 'High Court of Uganda — Land Division', 'Land occupation and title disputes', 'Illustrative entry: verify the official decision and full citation on ULII before relying on it.')
) AS source(case_number, court, title, summary)
WHERE public.judgements.case_number = source.case_number;
