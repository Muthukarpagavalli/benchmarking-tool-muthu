INSERT INTO "Category" ("id", "slug", "name", "description")
VALUES
  ('cat_clm', 'clm', 'CLM', 'Contract lifecycle management: Intake, negotiation, creation, approval, execution and storage.'),
  ('cat_dms', 'dms', 'DMS', 'Document and email management: storage, version control, ethical walls, and AI-assisted retrieval.'),
  ('cat_genai', 'genai', 'GenAI', 'Generative AI platforms for legal research, drafting, contract review, and due diligence.'),
  ('cat_ediscovery', 'ediscovery', 'E-Discovery', 'Identify, collect, review, and produce digital evidence defensibly.'),
  ('cat_legal_research', 'legal-research', 'Legal Research', 'Case law, statutes, and secondary sources, increasingly AI-assisted.'),
  ('cat_practice_management', 'practice-management', 'Practice Management', 'Case and matter management, billing, intake, and firm operations.')
ON CONFLICT ("slug") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description";
