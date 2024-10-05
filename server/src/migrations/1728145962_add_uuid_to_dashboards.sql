-- Ensure the extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE dashboards
ADD COLUMN uuid UUID DEFAULT uuid_generate_v4();

CREATE INDEX uuid_ind ON dashboards (uuid);

ALTER TABLE dashboards
ADD CONSTRAINT unique_uuid UNIQUE (uuid);
