import { pgTable, integer, text, primaryKey } from "drizzle-orm/pg-core";

export const documentSequences = pgTable(
  "document_sequences",
  {
    year: integer("year").notNull(),
    docType: text("doc_type").notNull(),
    projectCode: text("project_code").notNull(),
    lastValue: integer("last_value").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.year, t.docType, t.projectCode] }),
  ],
);
