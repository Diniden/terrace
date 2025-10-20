-- Initialize terrace database
-- This script runs automatically when the PostgreSQL container is first created

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add any initial database setup here
-- Tables will be created by NestJS/TypeORM migrations

-- Create a default schema comment
COMMENT ON DATABASE terrace IS 'Terrace application database - NestJS + React + PostgreSQL';

-- Function to automatically set fact state to CLARIFY when statement is empty
CREATE OR REPLACE FUNCTION set_fact_state_on_empty_statement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.statement IS NULL OR NEW.statement = '' THEN
    NEW.state := 'clarify';
  ELSIF NEW.statement IS NOT NULL AND NEW.statement != '' AND OLD.statement IS NULL THEN
    NEW.state := 'ready';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decouple Basis and Support relationships when Fact is moved to new Corpus
CREATE OR REPLACE FUNCTION decouple_fact_relationships_on_corpus_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if corpus_id has actually changed
  IF NEW.corpus_id != OLD.corpus_id THEN
    -- Clear the basis relationship
    NEW.basis_id := NULL;

    -- Delete all support relationships (both as supporter and supported)
    DELETE FROM fact_support WHERE fact_id = NEW.id OR support_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate basis is in same corpus or basis corpus
CREATE OR REPLACE FUNCTION validate_fact_basis()
RETURNS TRIGGER AS $$
DECLARE
  fact_corpus_id UUID;
  basis_corpus_id UUID;
  corpus_basis_id UUID;
BEGIN
  -- If there's no basis, validation passes
  IF NEW.basis_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the corpus_id of the current fact
  fact_corpus_id := NEW.corpus_id;

  -- Get the corpus_id of the basis fact
  SELECT corpus_id INTO basis_corpus_id FROM facts WHERE id = NEW.basis_id;

  -- Get the basis_corpus_id of the fact's corpus
  SELECT basis_corpus_id INTO corpus_basis_id FROM corpuses WHERE id = fact_corpus_id;

  -- Basis fact must be either:
  -- 1. In the same corpus as this fact
  -- 2. In the basis corpus of this fact's corpus
  -- 3. NULL basis is allowed
  IF basis_corpus_id != fact_corpus_id AND (corpus_basis_id IS NULL OR basis_corpus_id != corpus_basis_id) THEN
    RAISE EXCEPTION 'Fact basis must be in the same corpus or in the corpus basis corpus';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate support relationships are in same corpus
CREATE OR REPLACE FUNCTION validate_fact_support()
RETURNS TRIGGER AS $$
DECLARE
  fact_corpus_id UUID;
  support_corpus_id UUID;
BEGIN
  -- Get corpus_id of both facts
  SELECT corpus_id INTO fact_corpus_id FROM facts WHERE id = NEW.fact_id;
  SELECT corpus_id INTO support_corpus_id FROM facts WHERE id = NEW.support_id;

  -- Both facts must be in the same corpus
  IF fact_corpus_id != support_corpus_id THEN
    RAISE EXCEPTION 'Support relationships can only exist between facts in the same corpus';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Triggers will be created after TypeORM creates the tables
-- These will be added in a separate migration after initial schema creation
