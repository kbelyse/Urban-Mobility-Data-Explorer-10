import os
import mysql.connector
import csv
from datetime import datetime

CLEAN_PATH = "../data/processed/trips_cleaned.csv"
SCHEMA_PATH = "../backend/db/schema.sql"

def connect_db():
    return mysql.connector.connect(
        host="localhost",
        user="team10",
        password="Team10",
        database="trips",
        port=3306,
        auth_plugin='mysql_native_password'
    )

def create_table(conn):
    """Execute table creation from schema.sql."""
    with open(SCHEMA_PATH) as schema_file:
        schema_sql = schema_file.read()
    
    curs = conn.cursor()
    try:
        for statement in schema_sql.split(';'):
            stmt = statement.strip()
            if stmt:
                curs.execute(stmt)
        conn.commit()
    except Exception as e:
        print(f"Table creation error: {e}")
        raise
    finally:
        curs.close()

def create_indexes_if_not_exist(conn):
    """Check and create indexes if they don't exist."""
    indexes = [
        ("idx_trips_pickup_time", "CREATE INDEX idx_trips_pickup_time ON trips (pickup_datetime)"),
        ("idx_trips_speed", "CREATE INDEX idx_trips_speed ON trips (trip_speed_km_hr)"),
        ("idx_trips_pickup_loc", "CREATE INDEX idx_trips_pickup_loc ON trips (pickup_latitude, pickup_longitude)")
    ]
    
    curs = conn.cursor()
    try:
        for index_name, create_sql in indexes:
            curs.execute("""
                SELECT COUNT(*) 
                FROM INFORMATION_SCHEMA.STATISTICS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'trips' 
                AND INDEX_NAME = %s
            """, (index_name,))
            exists = curs.fetchone()[0] > 0
            if not exists:
                print(f"Creating index {index_name}...")
                curs.execute(create_sql)
        conn.commit()
    except Exception as e:
        print(f"Index creation error: {e}")
        raise
    finally:
        curs.close()

def insert_trips(conn):
    """Insert trips from CSV with proper handling of missing fare fields."""
    if not os.path.exists(CLEAN_PATH):
        print(f"Warning: CSV file not found at {CLEAN_PATH}. Skipping data load.")
        return
    
    curs = conn.cursor()
    try:
        with open(CLEAN_PATH, newline='') as f:
            reader = csv.DictReader(f)
            batch = []
            batch_size = 1000
            row_count = 0
            
            for row in reader:
                # Handle missing fare fields from sample data
                params = {
                    'id': row['id'],
                    'vendor_id': int(row['vendor_id']) if row['vendor_id'] else None,
                    'pickup_datetime': datetime.strptime(row['pickup_datetime'], '%Y-%m-%d %H:%M:%S'),
                    'dropoff_datetime': datetime.strptime(row['dropoff_datetime'], '%Y-%m-%d %H:%M:%S'),
                    'passenger_count': int(row['passenger_count']) if row['passenger_count'] else None,
                    'pickup_longitude': float(row['pickup_longitude']) if row['pickup_longitude'] else None,
                    'pickup_latitude': float(row['pickup_latitude']) if row['pickup_latitude'] else None,
                    'dropoff_longitude': float(row['dropoff_longitude']) if row['dropoff_longitude'] else None,
                    'dropoff_latitude': float(row['dropoff_latitude']) if row['dropoff_latitude'] else None,
                    'trip_duration': int(row['trip_duration']) if row['trip_duration'] else None,
                    # Handle missing fare fields - set to 0 or NULL based on your data
                    'fare_amount': float(row.get('fare_amount', 0.0)) if row.get('fare_amount') else 0.0,
                    'tip_amount': float(row.get('tip_amount', 0.0)) if row.get('tip_amount') else 0.0,
                    'total_amount': float(row.get('total_amount', 0.0)) if row.get('total_amount') else 0.0,
                    'trip_speed_km_hr': float(row['trip_speed_km_hr']) if row['trip_speed_km_hr'] else None,
                    'fare_per_km': float(row['fare_per_km']) if row['fare_per_km'] else None,
                    'is_rush_hour': 1 if row['is_rush_hour'].lower() in ['true', '1', 'yes'] else 0,
                }
                batch.append(params)
                row_count += 1
                
                if len(batch) >= batch_size:
                    curs.executemany(
                        """
                        INSERT IGNORE INTO trips (
                            id, vendor_id, pickup_datetime, dropoff_datetime,
                            passenger_count, pickup_longitude, pickup_latitude,
                            dropoff_longitude, dropoff_latitude, trip_duration,
                            fare_amount, tip_amount, total_amount,
                            trip_speed_km_hr, fare_per_km, is_rush_hour
                        ) VALUES (
                            %(id)s, %(vendor_id)s, %(pickup_datetime)s, %(dropoff_datetime)s,
                            %(passenger_count)s, %(pickup_longitude)s, %(pickup_latitude)s,
                            %(dropoff_longitude)s, %(dropoff_latitude)s, %(trip_duration)s,
                            %(fare_amount)s, %(tip_amount)s, %(total_amount)s,
                            %(trip_speed_km_hr)s, %(fare_per_km)s, %(is_rush_hour)s
                        )
                        """,
                        batch
                    )
                    conn.commit()
                    batch = []
                    print(f"Loaded {row_count} rows...")
            
            if batch:
                curs.executemany(
                    """
                    INSERT IGNORE INTO trips (
                        id, vendor_id, pickup_datetime, dropoff_datetime,
                        passenger_count, pickup_longitude, pickup_latitude,
                        dropoff_longitude, dropoff_latitude, trip_duration,
                        fare_amount, tip_amount, total_amount,
                        trip_speed_km_hr, fare_per_km, is_rush_hour
                    ) VALUES (
                        %(id)s, %(vendor_id)s, %(pickup_datetime)s, %(dropoff_datetime)s,
                        %(passenger_count)s, %(pickup_longitude)s, %(pickup_latitude)s,
                        %(dropoff_longitude)s, %(dropoff_latitude)s, %(trip_duration)s,
                        %(fare_amount)s, %(tip_amount)s, %(total_amount)s,
                        %(trip_speed_km_hr)s, %(fare_per_km)s, %(is_rush_hour)s
                    )
                    """,
                    batch
                )
                conn.commit()
        
        print(f"Successfully loaded {row_count} trips!")
    except Exception as e:
        print(f"Insert error: {e}")
        raise
    finally:
        curs.close()

def main():
    """Main function to create schema and load data."""
    conn = connect_db()
    try:
        print("Creating table and indexes...")
        create_table(conn)
        create_indexes_if_not_exist(conn)
        
        print("Loading trip data...")
        insert_trips(conn)
        
        print("Data loaded successfully!")
        print("Verify in MySQL: SELECT COUNT(*) FROM trips;")
        
    except Exception as e:
        print(f"Failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
