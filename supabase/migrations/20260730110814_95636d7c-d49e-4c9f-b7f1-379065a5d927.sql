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
  country TEXT DEFAULT 'Kenya',
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