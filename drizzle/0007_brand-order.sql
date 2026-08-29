ALTER TABLE "brands" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
WITH ordered AS (
  SELECT "id", row_number() OVER (ORDER BY "id") - 1 AS next_position
  FROM "brands"
)
UPDATE "brands"
SET "position" = ordered.next_position
FROM ordered
WHERE "brands"."id" = ordered."id";
