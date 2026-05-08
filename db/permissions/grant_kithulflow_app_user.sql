-- Run this in pgAdmin while connected to the kithulflow database as postgres.
-- It fixes permissions when tables were created manually by postgres,
-- but the app connects using the kithulflow role from DATABASE_URL.

ALTER DATABASE kithulflow OWNER TO kithulflow;
ALTER SCHEMA public OWNER TO kithulflow;

GRANT CONNECT ON DATABASE kithulflow TO kithulflow;
GRANT USAGE, CREATE ON SCHEMA public TO kithulflow;

DO $$
DECLARE
    item RECORD;
BEGIN
    FOR item IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I OWNER TO kithulflow', item.tablename);
        EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO kithulflow', item.tablename);
    END LOOP;

    FOR item IN
        SELECT sequencename
        FROM pg_sequences
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER SEQUENCE public.%I OWNER TO kithulflow', item.sequencename);
        EXECUTE format('GRANT ALL PRIVILEGES ON SEQUENCE public.%I TO kithulflow', item.sequencename);
    END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kithulflow;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kithulflow;
