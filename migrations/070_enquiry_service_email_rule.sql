ALTER TABLE enquiry_services
  ADD COLUMN email_rule_key varchar(50);

UPDATE enquiry_services SET email_rule_key = 'live_band' WHERE name = 'Live Band (3/5/7 piece)';
UPDATE enquiry_services SET email_rule_key = 'video' WHERE name = 'Wedding Film';
UPDATE enquiry_services SET email_rule_key = 'photo' WHERE name = 'Photography';
UPDATE enquiry_services SET email_rule_key = 'music' WHERE name = 'Saxophone Solo';
UPDATE enquiry_services SET email_rule_key = 'singing_waiter' WHERE name = 'Singing Waiting';
UPDATE enquiry_services SET email_rule_key = 'ceilidh' WHERE name = 'Ceilidh';
UPDATE enquiry_services SET email_rule_key = 'music' WHERE name = 'Bagpipes';
UPDATE enquiry_services SET email_rule_key = 'music' WHERE name = 'DJ';
UPDATE enquiry_services SET email_rule_key = 'music' WHERE name = 'Karaoke/Bandeoke';
