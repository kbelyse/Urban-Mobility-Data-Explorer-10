DROP TABLE IF EXISTS trips;

CREATE TABLE IF NOT EXISTS trips (
  id VARCHAR(36) PRIMARY KEY,
  vendor_id INT,
  pickup_datetime TIMESTAMP NOT NULL,
  dropoff_datetime TIMESTAMP NOT NULL,
  passenger_count INT,
  pickup_longitude DOUBLE,
  pickup_latitude DOUBLE,
  dropoff_longitude DOUBLE,
  dropoff_latitude DOUBLE,
  trip_duration INT,
  fare_amount DECIMAL(10,2),
  tip_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  trip_speed_km_hr DOUBLE,
  fare_per_km DOUBLE,
  is_rush_hour BOOLEAN
);


CREATE INDEX idx_trips_pickup_time ON trips (pickup_datetime);
CREATE INDEX idx_trips_speed ON trips (trip_speed_km_hr);
CREATE INDEX idx_trips_pickup_loc ON trips (pickup_latitude, pickup_longitude);