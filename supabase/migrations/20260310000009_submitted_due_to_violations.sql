-- Mark submissions that were auto-submitted after 3 fullscreen violations (so teacher knows context).

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS submitted_due_to_violations boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN submissions.submitted_due_to_violations IS 'True when exam was auto-submitted after 3 fullscreen violations; teacher sees this when evaluating.';
