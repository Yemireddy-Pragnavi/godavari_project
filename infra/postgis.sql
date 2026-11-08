CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS access_nodes(id text PRIMARY KEY, name text NOT NULL, geometry geometry(Point,4326) NOT NULL);
CREATE TABLE IF NOT EXISTS access_edges(id text PRIMARY KEY,name text NOT NULL,source text REFERENCES access_nodes(id),target text REFERENCES access_nodes(id),geometry geometry(LineString,4326) NOT NULL,length_m double precision CHECK(length_m>0),state text NOT NULL DEFAULT 'UNKNOWN' CHECK(state IN ('UNKNOWN','POSSIBLE_OBSTRUCTION','REPORTED_OBSTRUCTED','RESTRICTED','POSSIBLY_CLEAR','VERIFIED_ACCESSIBLE','VERIFICATION_EXPIRED')),version integer NOT NULL DEFAULT 1,verified_at timestamptz,expires_at timestamptz,authorized boolean NOT NULL DEFAULT false);
CREATE INDEX IF NOT EXISTS edges_geometry ON access_edges USING gist(geometry);
CREATE TABLE IF NOT EXISTS research_runs(id uuid PRIMARY KEY,kind text NOT NULL,input jsonb NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
