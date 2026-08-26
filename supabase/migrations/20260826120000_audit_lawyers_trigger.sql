-- Ensure advocate verification and profile photo changes appear in the admin audit trail.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_lawyers') THEN
    CREATE TRIGGER trg_audit_lawyers
      AFTER INSERT OR UPDATE OR DELETE ON public.lawyers
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();
  END IF;
END $$;
