-- Module 08: Visual DNA System
-- Add visual_description column to pets table

ALTER TABLE "pets" 
ADD COLUMN IF NOT EXISTS "visual_description" TEXT;

COMMENT ON COLUMN "pets"."visual_description" IS 'Permanent text-based visual description (Visual DNA) of the pet for consistent image generation.';
