-- Localise the original demo content. These advocate entries and stock portraits
-- are illustrative only; publish real profiles only after Uganda Law Council
-- verification and consent to use each person's photograph.

ALTER TABLE public.profiles ALTER COLUMN country SET DEFAULT 'Uganda';

UPDATE public.lawyers
SET
  full_name = source.full_name,
  headline = source.headline,
  bio = source.bio,
  firm = source.firm,
  county = source.district,
  city = source.city,
  practice_areas = source.practice_areas,
  languages = source.languages,
  hourly_rate = source.hourly_rate,
  consultation_fee = source.consultation_fee,
  bar_number = source.bar_number,
  email = source.email,
  phone = source.phone,
  photo_url = source.photo_url
FROM (
  VALUES
    ('amara@otienomwangi.co.ke', 'Nabirye Kato', 'Constitutional & human rights advocate', 'Nabirye supports rights-based litigation and public-interest matters before Uganda''s courts.', 'Kato & Partners Advocates', 'Kampala Central', 'Kampala', ARRAY['Constitutional Law','Human Rights','Public Interest'], ARRAY['English','Luganda'], 350000, 150000, 'ULC-DEMO-001', 'nabirye.kato@example.com', '+256 700 100 201', '/images/profiles/amara.jpg'),
    ('d.kimani@kimanipartners.co.ke', 'Michael Okello', 'Commercial & corporate counsel', 'Michael advises growing businesses on contracts, company matters and regional trade.', 'Okello Commercial Advocates', 'Nakawa', 'Kampala', ARRAY['Corporate Law','Commercial Law','Contracts'], ARRAY['English','Luganda'], 450000, 200000, 'ULC-DEMO-002', 'michael.okello@example.com', '+256 700 100 202', '/images/profiles/david.jpg'),
    ('fatuma@hassanlegal.co.ke', 'Aisha Nambasa', 'Family law & child protection specialist', 'Aisha supports families in custody, succession and matrimonial-property matters.', 'Nambasa Legal Chambers', 'Jinja', 'Jinja', ARRAY['Family Law','Succession','Child Protection'], ARRAY['English','Luganda','Swahili'], 300000, 120000, 'ULC-DEMO-003', 'aisha.nambasa@example.com', '+256 700 100 203', '/images/profiles/fatuma.jpg'),
    ('peter@wanyamaco.co.ke', 'Isaac Ocen', 'Criminal defence advocate', 'Isaac represents clients in criminal proceedings, bail applications and appeals.', 'Ocen & Co. Advocates', 'Gulu', 'Gulu', ARRAY['Criminal Defence','Bail Applications','Appeals'], ARRAY['English','Luo'], 400000, 180000, 'ULC-DEMO-004', 'isaac.ocen@example.com', '+256 700 100 204', '/images/profiles/peter.jpg'),
    ('grace@njeriadvocates.co.ke', 'Sarah Atwine', 'Employment & labour law advocate', 'Sarah advises employees and employers on workplace disputes, contracts and compliance.', 'Atwine Advocates', 'Mbarara', 'Mbarara', ARRAY['Employment Law','Labour Disputes','HR Compliance'], ARRAY['English','Runyankole'], 280000, 110000, 'ULC-DEMO-005', 'sarah.atwine@example.com', '+256 700 100 205', '/images/profiles/grace.jpg'),
    ('sbarasa@barasalaw.co.ke', 'Daniel Mugisha', 'Land, property & conveyancing advocate', 'Daniel handles land transactions, estate planning and property disputes.', 'Mugisha & Associates', 'Kabarole', 'Fort Portal', ARRAY['Land Law','Conveyancing','Property Disputes'], ARRAY['English','Rutooro'], 330000, 130000, 'ULC-DEMO-006', 'daniel.mugisha@example.com', '+256 700 100 206', '/images/profiles/samuel.jpg'),
    ('lucy@achienglaw.co.ke', 'Brenda Nakato', 'Immigration & refugee law advocate', 'Brenda guides individuals and families through immigration, citizenship and refugee-law matters.', 'Nakato Immigration Law', 'Makindye', 'Kampala', ARRAY['Immigration','Refugee Law','Citizenship'], ARRAY['English','Luganda','French'], 320000, 140000, 'ULC-DEMO-007', 'brenda.nakato@example.com', '+256 700 100 207', '/images/profiles/lucy.jpg'),
    ('brian@mutisotech.co.ke', 'Joshua Ssemanda', 'Technology, data & IP advocate', 'Joshua advises organisations on data protection, licensing and intellectual-property issues.', 'Ssemanda Technology Law', 'Rubaga', 'Kampala', ARRAY['Data Protection','Intellectual Property','Technology'], ARRAY['English','Luganda'], 380000, 170000, 'ULC-DEMO-008', 'joshua.ssemanda@example.com', '+256 700 100 208', '/images/profiles/brian.jpg')
) AS source(old_email, full_name, headline, bio, firm, district, city, practice_areas, languages, hourly_rate, consultation_fee, bar_number, email, phone, photo_url)
WHERE public.lawyers.email = source.old_email;

UPDATE public.library_items
SET author = 'Republic of Uganda',
    description = 'The supreme law of Uganda, including the Bill of Rights and the structure of government.'
WHERE title = 'The Constitution' AND author = 'Republic of Kenya';

UPDATE public.library_items
SET
  title = source.title,
  author = source.author,
  category = source.category,
  description = source.description,
  year = source.year
FROM (
  VALUES
    ('Employment Act', 'Employment Act, 2006', 'Parliament of Uganda', 'Statute', 'Regulates employment relationships, rights and obligations in Uganda.', 2006),
    ('Land Registration Act', 'Land Act, 1998', 'Parliament of Uganda', 'Statute', 'Provides for land tenure, land administration and related rights in Uganda.', 1998),
    ('Evidence Act', 'Evidence Act', 'Parliament of Uganda', 'Statute', 'Sets rules on the admissibility and proof of evidence in court proceedings.', 1909),
    ('Civil Procedure Rules', 'Civil Procedure Rules', 'Rules Committee', 'Procedure', 'Procedural framework for civil proceedings in Uganda.', 1971),
    ('Children Act', 'Children Act', 'Parliament of Uganda', 'Statute', 'Provides for the care, protection and welfare of children.', 1997),
    ('Data Protection Act', 'Data Protection and Privacy Act, 2019', 'Parliament of Uganda', 'Statute', 'Regulates the collection and processing of personal data and establishes data-subject rights.', 2019),
    ('Law of Succession Act', 'Succession Act', 'Parliament of Uganda', 'Statute', 'Governs estates, wills and the administration of deceased persons'' property.', 1906)
) AS source(old_title, title, author, category, description, year)
WHERE public.library_items.title = source.old_title;

UPDATE public.legal_advices
SET
  title = source.title,
  category = source.category,
  summary = source.summary,
  body = source.body
FROM (
  VALUES
    ('first-hour-after-arrest', 'What to do after an arrest in Uganda', 'Criminal', 'Practical first steps and safeguards after an arrest.', 'Stay calm and ask why you are being arrested. Tell a trusted person where you are and ask to contact a lawyer. Under Article 23 of the Constitution, a person arrested or detained on suspicion of a criminal offence must be brought before a court as soon as possible and not later than forty-eight hours from arrest. Do not sign a statement you do not understand. This guide is general information, not legal advice.'),
    ('matrimonial-property', 'Understanding family property in Uganda', 'Family', 'Why records, independent advice and the facts of each case matter.', 'Family-property questions depend on the facts, the type of property, contributions and the applicable law. Keep records of payments, agreements, titles and communications. Get advice from a qualified Ugandan advocate before signing an agreement or starting a court process.'),
    ('fair-termination', 'Employment termination: fair process in Uganda', 'Employment', 'Questions to consider if an employment relationship is ending.', 'Keep copies of your contract, notices, payslips and correspondence. The Employment Act, 2006 regulates employment rights and obligations. A lawyer or labour officer can assess the facts of a particular dismissal, including notice, procedure and outstanding payments.'),
    ('buying-land-safely', 'Buying land safely in Uganda', 'Property', 'Due diligence steps before you pay for land.', 'Confirm the seller''s identity and authority to sell. Carry out an official search and inspect the land in person. Uganda recognises customary, freehold, mailo and leasehold tenure, so obtain advice appropriate to the tenure and location. Do not rely on informal assurances; use written documents and an independent advocate.'),
    ('tenant-lockout', 'When a landlord threatens eviction', 'Property', 'Document what happens and seek prompt, local legal advice.', 'Do not use force or escalate a dispute. Keep your tenancy agreement, receipts and photographs, and record the dates and people involved. Consider reporting a crime to the police where appropriate and obtain advice from a qualified advocate about the remedies available on your facts.'),
    ('small-claims', 'Small claims in Uganda', 'Civil', 'A simpler court procedure for qualifying civil and commercial claims.', 'Uganda''s Small Claims Procedure Rules, 2011 cover qualifying claims of up to UGX 10,000,000. Prepare the documents that support your claim, identify the correct defendant and ask the court clerk or a legal assistant to explain the procedure. Check the current rules and obtain legal advice if your matter is complex.')
) AS source(slug, title, category, summary, body)
WHERE public.legal_advices.slug = source.slug;

UPDATE public.police_stations
SET
  name = source.name,
  county = source.district,
  address = source.address,
  phone = source.phone,
  email = source.email,
  latitude = source.latitude,
  longitude = source.longitude
FROM (
  VALUES
    ('central@police.go.ke', 'Central Police Station', 'Kampala Central', 'Kampala Road, Kampala', '+256 414 222 222', 'central@upf.go.ug', 0.313600, 32.581100),
    ('kilimani@police.go.ke', 'Jinja Road Police Station', 'Nakawa', 'Jinja Road, Kampala', '+256 414 222 223', 'jinjaroad@upf.go.ug', 0.322700, 32.603400),
    ('mombasacentral@police.go.ke', 'Jinja Central Police Station', 'Jinja', 'Main Street, Jinja', '+256 434 120 000', 'jinja@upf.go.ug', 0.424400, 33.204100),
    ('kisumucentral@police.go.ke', 'Gulu Central Police Station', 'Gulu', 'Gulu Town', '+256 471 432 000', 'gulu@upf.go.ug', 2.774600, 32.298900),
    ('nakurucentral@police.go.ke', 'Mbarara Central Police Station', 'Mbarara', 'High Street, Mbarara', '+256 485 420 000', 'mbarara@upf.go.ug', -0.607200, 30.654500),
    ('eldoret@police.go.ke', 'Fort Portal Police Station', 'Kabarole', 'Lugard Road, Fort Portal', '+256 483 420 000', 'fortportal@upf.go.ug', 0.671000, 30.275000)
) AS source(old_email, name, district, address, phone, email, latitude, longitude)
WHERE public.police_stations.email = source.old_email;

UPDATE public.wanted_persons
SET status = 'removed'
WHERE name LIKE 'Unidentified suspect%';

UPDATE public.judgements
SET
  court = source.court,
  title = source.title,
  summary = source.summary
FROM (
  VALUES
    ('SCK/PET/12', 'Supreme Court of Uganda', 'Public participation in legislation', 'Illustrative entry: verify the official decision and full citation on ULII before relying on it.'),
    ('CA/CIV/238', 'Court of Appeal of Uganda', 'Property contributions in family disputes', 'Illustrative entry: verify the official decision and full citation on ULII before relying on it.'),
    ('HC/CRIM/91', 'High Court of Uganda', 'Digital evidence and chain of custody', 'Illustrative entry: verify the official decision and full citation on ULII before relying on it.'),
    ('ELRC/45', 'Industrial Court of Uganda', 'Employment procedure in redundancy matters', 'Illustrative entry: verify the official decision and full citation on ULII before relying on it.'),
    ('ELC/302', 'High Court of Uganda — Land Division', 'Land occupation and title disputes', 'Illustrative entry: verify the official decision and full citation on ULII before relying on it.')
) AS source(case_number, court, title, summary)
WHERE public.judgements.case_number = source.case_number;
