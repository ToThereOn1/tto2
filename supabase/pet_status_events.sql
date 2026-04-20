-- ToThereOn Pet Status Events Table
-- Add this to your existing schema.sql or run separately

-- Create pet_status_events table
CREATE TABLE IF NOT EXISTS public.pet_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  tothereon_day INTEGER NOT NULL DEFAULT 0,
  event_type TEXT NOT NULL DEFAULT 'daily_life',
  event_title TEXT NOT NULL,
  event_description TEXT NOT NULL,
  zone TEXT DEFAULT 'rainbow_valley',
  related_npc TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pet_status_events_pet_id ON public.pet_status_events(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_status_events_day ON public.pet_status_events(tothereon_day DESC);
CREATE INDEX IF NOT EXISTS idx_pet_status_events_pet_day ON public.pet_status_events(pet_id, tothereon_day DESC);

-- Enable RLS
ALTER TABLE public.pet_status_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see events for their own pets
CREATE POLICY "Users can view own pet events" ON public.pet_status_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pets 
      WHERE pets.id = pet_status_events.pet_id 
      AND pets.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert events" ON public.pet_status_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pets 
      WHERE pets.id = pet_status_events.pet_id 
      AND pets.user_id = auth.uid()
    )
  );

-- Update trigger
CREATE TRIGGER update_pet_status_events_updated_at
  BEFORE UPDATE ON public.pet_status_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE public.pet_status_events IS 'Pet status feed events - auto-generated updates about pet life in ToThereOn World';
