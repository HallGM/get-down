ALTER TABLE refunds
  ADD COLUMN subtype VARCHAR(50) NOT NULL DEFAULT 'adjustment';
