-- Presentation-ready demo content: library file links, news imagery,
-- Ugandan wanted notices, and sample judgement PDF links.

UPDATE public.library_items
SET file_url = '/docs/demo/' ||
  CASE title
    WHEN 'The Constitution' THEN 'constitution-of-uganda-demo.pdf'
    WHEN 'Employment Act, 2006' THEN 'employment-act-2006-demo.pdf'
    WHEN 'Land Act, 1998' THEN 'land-act-1998-demo.pdf'
    WHEN 'Evidence Act' THEN 'evidence-act-demo.pdf'
    WHEN 'Civil Procedure Rules' THEN 'civil-procedure-rules-demo.pdf'
    WHEN 'Children Act' THEN 'children-act-demo.pdf'
    WHEN 'Data Protection and Privacy Act, 2019' THEN 'data-protection-privacy-act-2019-demo.pdf'
    WHEN 'Succession Act' THEN 'succession-act-demo.pdf'
    ELSE 'legal-document-demo.pdf'
  END
WHERE file_url IS NULL;

UPDATE public.news_posts
SET image_url = source.image_url
FROM (
  VALUES
    ('e-filing-rollout', '/images/content/news-efiling.jpg'),
    ('data-protection-penalties', '/images/content/news-data.jpg'),
    ('small-claims-record', '/images/content/news-claims.jpg'),
    ('legal-aid-expansion', '/images/content/news-aid.jpg')
) AS source(slug, image_url)
WHERE public.news_posts.slug = source.slug
  AND (public.news_posts.image_url IS NULL OR public.news_posts.image_url = '');

UPDATE public.legal_advices
SET image_url = source.image_url
FROM (
  VALUES
    ('first-hour-after-arrest', '/images/content/advice-arrest.jpg'),
    ('matrimonial-property', '/images/content/advice-family.jpg'),
    ('fair-termination', '/images/content/advice-employment.jpg'),
    ('buying-land-safely', '/images/content/advice-land.jpg'),
    ('tenant-lockout', '/images/content/advice-tenant.jpg'),
    ('small-claims', '/images/content/advice-claims.jpg')
) AS source(slug, image_url)
WHERE public.legal_advices.slug = source.slug
  AND (public.legal_advices.image_url IS NULL OR public.legal_advices.image_url = '');

UPDATE public.judgements
SET file_url = '/docs/demo/judgement-' || lower(replace(case_number, '/', '-')) || '-demo.pdf'
WHERE file_url IS NULL;

-- Replace removed Kenyan placeholder wanted notices with Ugandan demo entries.
DELETE FROM public.wanted_persons
WHERE name LIKE 'Unidentified suspect%' OR status = 'removed';

INSERT INTO public.wanted_persons (
  name, alias, description, offence, last_seen, danger_level, status, reward, photo_url
)
SELECT * FROM (
  VALUES
    (
      'Demo suspect — Case OB 214/26',
      '—',
      'Male, approximately 28-35 years, medium build. Sought for questioning in connection with a series of commercial burglaries in Kampala. Illustrative demo record only.',
      'Aggravated burglary',
      'Industrial Area, Kampala',
      'high',
      'wanted',
      2000000,
      '/images/profiles/client-joseph.jpg'
    ),
    (
      'Demo suspect — Case OB 091/26',
      '—',
      'Male, approximately 25 years, slim build, last seen wearing a dark hooded jacket. Sought for questioning in a motor-vehicle theft investigation. Illustrative demo record only.',
      'Motor vehicle theft',
      'Gulu Town',
      'medium',
      'wanted',
      1000000,
      '/images/profiles/suspect-no-photo.jpg'
    ),
    (
      'Demo suspect — Case OB 188/25',
      '—',
      'Female, approximately 40 years, sought in connection with a large-scale mobile-money fraud affecting multiple complainants. Illustrative demo record only.',
      'Fraud and obtaining by false pretences',
      'Jinja',
      'medium',
      'wanted',
      1500000,
      '/images/profiles/client-amina.jpg'
    )
) AS demo(
  name, alias, description, offence, last_seen, danger_level, status, reward, photo_url
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.wanted_persons wp WHERE wp.name = demo.name
);
