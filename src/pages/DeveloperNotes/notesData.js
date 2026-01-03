// 📄 src/pages/DeveloperNotes/notesData.js

export const NOTES = [
  {
    id: "db-indexes-hot-tables",
    title: "List indexes for hot tables",
    type: "sql",
    tags: ["DB", "Indexes", "SanityCheck"],
    appliesTo: "Postgres",
    whenToUse:
      "Use this when a query suddenly slows down or after a migration. It helps quickly confirm which indexes exist on our most frequently queried tables.",
    content: `SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('MessageLogs', 'CampaignSendLogs', 'CampaignRecipients', 'Contacts', 'ContactReads')
ORDER BY tablename, indexname;`,
    relatedTables: [
      "MessageLogs",
      "CampaignSendLogs",
      "CampaignRecipients",
      "Contacts",
      "ContactReads",
    ],
  },
  {
    id: "db-indexes-duplicate-defs",
    title: "Detect duplicate indexes (same definition, different names)",
    type: "sql",
    tags: ["DB", "Indexes", "Duplicates"],
    appliesTo: "Postgres",
    whenToUse:
      "Use this after repeated migrations/patches or emergency production fixes. Duplicate indexes waste disk and slow writes.",
    content: `SELECT
  tablename,
  regexp_replace(indexdef, 'INDEX\\s+\\S+\\s+', 'INDEX <name> ', 'i') AS normalized_def,
  count(*) AS copies,
  array_agg(indexname ORDER BY indexname) AS names
FROM pg_indexes
WHERE schemaname='public'
  AND tablename IN ('MessageLogs','CampaignSendLogs','Contacts','ContactReads')
GROUP BY tablename, normalized_def
HAVING count(*) > 1
ORDER BY copies DESC;`,
    relatedTables: ["MessageLogs", "CampaignSendLogs", "Contacts", "ContactReads"],
  },
  {
    id: "db-index-sizes-usage",
    title: "Index sizes + usage scan counts",
    type: "sql",
    tags: ["DB", "Indexes", "Performance"],
    appliesTo: "Postgres",
    whenToUse:
      "Use this when disk usage grows or you suspect an index isn't being used. High size + low scan count can indicate a candidate for removal or redesign.",
    content: `SELECT
  t.relname AS table_name,
  i.relname AS index_name,
  pg_size_pretty(pg_relation_size(i.oid)) AS index_size,
  idx_scan
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
LEFT JOIN pg_stat_user_indexes s ON s.indexrelid = i.oid
WHERE t.relname IN ('MessageLogs','CampaignSendLogs','Contacts','ContactReads')
ORDER BY pg_relation_size(i.oid) DESC;`,
    relatedTables: ["MessageLogs", "CampaignSendLogs", "Contacts", "ContactReads"],
  },
  {
    id: "db-analyze-after-index",
    title: "Refresh planner stats after index changes",
    type: "sql",
    tags: ["DB", "Analyze", "Performance"],
    appliesTo: "Postgres",
    whenToUse:
      "Use this after adding/removing indexes or backfilling large amounts of data so the planner has accurate statistics.",
    content: `ANALYZE "MessageLogs";
ANALYZE "CampaignSendLogs";`,
    relatedTables: ["MessageLogs", "CampaignSendLogs"],
  },
  {
    id: "db-explain-template",
    title: "EXPLAIN template for verifying index usage",
    type: "sql",
    tags: ["DB", "Explain", "Performance"],
    appliesTo: "Postgres",
    whenToUse:
      "Use this when verifying whether a specific index is used by a production query. Replace the placeholder SQL with the exact statement your service runs (with real values).",
    content: `EXPLAIN (ANALYZE, BUFFERS)
-- paste the exact SQL your service runs, with real values filled in
SELECT 1;`,
  },
  {
    id: "rule-index-source-of-truth",
    title: "Rule of thumb: one source of truth for indexes",
    type: "text",
    tags: ["EFCore", "Migrations", "Indexes"],
    appliesTo: "EF Core / Postgres",
    whenToUse:
      "Use this when planning schema changes, reviewing migrations, or doing production hotfixes that touch indexes.",
    content:
      "Keep index definitions centralized (prefer IEntityTypeConfiguration per entity). Avoid manually dropping indexes before EF migrations that rename/drop them. Prefer DROP INDEX IF EXISTS in cleanup migrations; use CONCURRENTLY with suppressTransaction in prod.",
  },
];

