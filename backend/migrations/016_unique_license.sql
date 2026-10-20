-- One account per surveying licence (Ameer, 2026-10-20). Compared ignoring case, spaces, dashes and Arabic digits.
create unique index if not exists providers_license_unique on providers (
  regexp_replace(translate(lower(license_no), '٠١٢٣٤٥٦٧٨٩', '0123456789'), '[^a-z0-9؀-ۿ]', '', 'g'))
  where license_no is not null and btrim(license_no) <> '';
