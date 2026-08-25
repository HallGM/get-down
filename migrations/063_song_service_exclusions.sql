-- Create song_service_exclusions join table for band-size service exclusions
CREATE TABLE song_service_exclusions (
  song_id    int REFERENCES songs(id) ON DELETE CASCADE NOT NULL,
  service_id int REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (song_id, service_id)
);

CREATE INDEX idx_song_service_exclusions_song_id ON song_service_exclusions(song_id);
CREATE INDEX idx_song_service_exclusions_service_id ON song_service_exclusions(service_id);
