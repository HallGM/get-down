-- Create sequence for person invoice numbers
CREATE SEQUENCE person_invoice_number_seq START 1;

-- Create a helper function to get the next invoice number
CREATE OR REPLACE FUNCTION next_person_invoice_number()
RETURNS varchar AS $$
BEGIN
  RETURN 'EA-' || LPAD(nextval('person_invoice_number_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;
