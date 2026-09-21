-- 20260825191000_presentation_dummy_content.sql left photo_url NULL for the "Motor vehicle
-- theft" demo wanted-person record only (its sibling demo rows got a photo). That migration
-- already ran, so this backfills the live row rather than editing applied history.
UPDATE public.wanted_persons
SET photo_url = '/images/profiles/suspect-no-photo.jpg'
WHERE name = 'Demo suspect — Case OB 091/26'
  AND offence = 'Motor vehicle theft'
  AND photo_url IS NULL;
