import csv
from datetime import datetime

RAW_PATH = "../data/raw/train.csv"
LOG_PATH = "../data/logs/cleaning_issues.csv"
CLEAN_PATH = "../data/processed/trips_cleaned.csv"

def parse_row(row):
    """Parse raw row (dict) and return cleaned dict or None if invalid."""
    try:
        
        rec_id = row["id"]
        
        vendor_id = int(row["vendor_id"])
        pickup = datetime.strptime(row["pickup_datetime"], "%Y-%m-%d %H:%M:%S")
        dropoff = datetime.strptime(row["dropoff_datetime"], "%Y-%m-%d %H:%M:%S")
        if dropoff <= pickup:
            return None
        
        passenger_count = int(row["passenger_count"])
        if passenger_count < 1:
            return None
        
        plon = float(row["pickup_longitude"])
        plat = float(row["pickup_latitude"])
        dlon = float(row["dropoff_longitude"])
        dlat = float(row["dropoff_latitude"])
       
        if not (-74.5 < plon < -72.5 and 40 < plat < 41.5):
            return None
        if not (-74.5 < dlon < -72.5 and 40 < dlat < 41.5):
            return None
        
        trip_duration = int(row["trip_duration"])
        if trip_duration <= 0:
            return None
       
        fare_amount = float(row.get("fare_amount", 0.0))
        tip_amount = float(row.get("tip_amount", 0.0))
        total_amount = float(row.get("total_amount", 0.0))
        
        return {
            "id": rec_id,
            "vendor_id": vendor_id,
            "pickup_datetime": pickup,
            "dropoff_datetime": dropoff,
            "passenger_count": passenger_count,
            "pickup_longitude": plon,
            "pickup_latitude": plat,
            "dropoff_longitude": dlon,
            "dropoff_latitude": dlat,
            "trip_duration": trip_duration,
            "fare_amount": fare_amount,
            "tip_amount": tip_amount,
            "total_amount": total_amount,
        }
    except Exception as e:
        return None

def clean_data():
    with open(RAW_PATH, newline='') as f_in, \
         open(CLEAN_PATH, "w", newline='') as f_out, \
         open(LOG_PATH, "w", newline='') as f_log:

        reader = csv.DictReader(f_in)
        fieldnames = list(reader.fieldnames) + [
            "trip_speed_km_hr", "fare_per_km", "is_rush_hour"
        ]
        writer = csv.DictWriter(f_out, fieldnames=fieldnames)
        log_writer = csv.DictWriter(f_log, fieldnames=reader.fieldnames)
        
        writer.writeheader()
        log_writer.writeheader()

        for row in reader:
            cleaned = parse_row(row)
            if cleaned is None:
                log_writer.writerow(row)
                continue
            
            
            dist_km = float(row.get("trip_distance", 0.0))
            duration_hr = cleaned["trip_duration"] / 3600.0
            if duration_hr > 0 and dist_km > 0:
                trip_speed = dist_km / duration_hr
            else:
                trip_speed = 0.0
            
            fare_per_km = (cleaned["fare_amount"] / dist_km) if dist_km > 0 else 0.0
            
            hr = cleaned["pickup_datetime"].hour
            is_rush = hr in list(range(7,10)) or hr in list(range(17,20))
            
            cleaned["trip_speed_km_hr"] = trip_speed
            cleaned["fare_per_km"] = fare_per_km
            cleaned["is_rush_hour"] = is_rush

            out = {k: cleaned.get(k, row.get(k)) for k in fieldnames}
            writer.writerow(out)

if __name__ == "__main__":
    clean_data()
