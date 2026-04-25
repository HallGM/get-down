-- Add item_type and section_name columns to set_list_items.
-- item_type: 'song' (default) or 'section' (divider/header row).
-- section_name: only set when item_type = 'section'.

ALTER TABLE set_list_items
  ADD COLUMN IF NOT EXISTS item_type    varchar(20)  NOT NULL DEFAULT 'song',
  ADD COLUMN IF NOT EXISTS section_name varchar(255);

-- Relax the song_or_unlinked constraint to permit section header rows
-- (which have no song_id and no unlinked_title).
ALTER TABLE set_list_items DROP CONSTRAINT IF EXISTS set_list_items_song_or_unlinked;
ALTER TABLE set_list_items
  ADD CONSTRAINT set_list_items_song_or_unlinked
  CHECK (item_type = 'section' OR song_id IS NOT NULL OR unlinked_title IS NOT NULL);

-- Assign explicit sequential positions to all existing song rows
-- (many may have position = NULL) so that the new section headers
-- at position 0 sort cleanly before them.
UPDATE set_list_items AS sli
SET position = sub.new_pos
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY gig_id ORDER BY position NULLS LAST, id) AS new_pos
  FROM set_list_items
  WHERE item_type = 'song'
) sub
WHERE sli.id = sub.id;

-- Insert a "Set 1" section header at position 0 for every gig
-- that already has at least one set_list_item.
INSERT INTO set_list_items (gig_id, item_type, section_name, position)
SELECT DISTINCT gig_id, 'section', 'Set 1', 0
FROM set_list_items
WHERE item_type = 'song'
ON CONFLICT DO NOTHING;
