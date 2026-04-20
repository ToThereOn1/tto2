-- Fix Pet Registration Schema: Species 옵션 추가, birth_date 필드 추가, gender 필드 추가
-- Supabase SQL Editor에서 실행

-- 1. Species 필드에 English 옵션 추가
UPDATE pet_registration_schema
SET options = '[
  {"label": "Dog", "value": "dog"},
  {"label": "Cat", "value": "cat"},
  {"label": "Bird", "value": "bird"},
  {"label": "Rabbit", "value": "rabbit"},
  {"label": "Hamster", "value": "hamster"},
  {"label": "Other", "value": "other"}
]'::jsonb,
    label_en = 'Species'
WHERE field_name = 'species';

-- 2. Gender 필드 추가 (order_index 25: species와 breed 사이)
INSERT INTO pet_registration_schema (field_name, label_kr, label_en, field_type, is_required, order_index, options)
VALUES (
  'gender',
  'Gender',
  'Gender',
  'select',
  false,
  25,
  '[
    {"label": "Boy", "value": "male"},
    {"label": "Girl", "value": "female"}
  ]'::jsonb
)
ON CONFLICT (field_name) DO UPDATE SET
  label_en = EXCLUDED.label_en,
  options = EXCLUDED.options,
  is_active = true;

-- 3. Birth Date 필드 추가 (order_index 35: breed 다음, passed_date 전)
INSERT INTO pet_registration_schema (field_name, label_kr, label_en, field_type, is_required, order_index)
VALUES (
  'birth_date',
  'Date of Birth',
  'Date of Birth',
  'date',
  false,
  35
)
ON CONFLICT (field_name) DO UPDATE SET
  label_en = EXCLUDED.label_en,
  is_active = true;

-- 4. 기존 필드 영어 레이블 확인/수정
UPDATE pet_registration_schema SET label_en = 'Name' WHERE field_name = 'name';
UPDATE pet_registration_schema SET label_en = 'Breed' WHERE field_name = 'breed';
UPDATE pet_registration_schema SET label_en = 'Date of Passing' WHERE field_name = 'passed_date';
UPDATE pet_registration_schema SET label_en = 'Photo' WHERE field_name = 'image';

-- 확인
SELECT field_name, label_en, field_type, is_required, options, order_index, is_active
FROM pet_registration_schema
ORDER BY order_index;
