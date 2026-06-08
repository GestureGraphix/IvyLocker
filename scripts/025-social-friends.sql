-- 025: Social features — friends, template sharing, workout invites

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT friendships_unique UNIQUE (requester_id, addressee_id),
  CONSTRAINT no_self_friend CHECK (requester_id != addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);

CREATE TABLE IF NOT EXISTS shared_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES training_templates(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT shared_templates_unique UNIQUE (template_id, shared_with)
);

CREATE INDEX IF NOT EXISTS idx_shared_templates_with ON shared_templates(shared_with);
CREATE INDEX IF NOT EXISTS idx_shared_templates_by   ON shared_templates(shared_by);

CREATE TABLE IF NOT EXISTS workout_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES training_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_invites_invitee ON workout_invites(invitee_id);
CREATE INDEX IF NOT EXISTS idx_workout_invites_inviter ON workout_invites(inviter_id);
