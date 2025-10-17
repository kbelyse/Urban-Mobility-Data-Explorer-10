## NYC Taxi Trip Dashboard

This project shows how to clean, store, and visualize **New York City taxi trip data**.
You will process the raw dataset, save it in a database, build an API, and display insights on a web dashboard.

---

## Important Notes

Required Installations:

MySQL (for database; e.g., via XAMPP, brew install mysql on macOS, or Docker).
Python 3.8+ (with pip).
Backend dependencies: flask, mysql-connector-python, flask-cors (via pip install -r backend/requirements.txt).


## Update Credentials (very important)

Edit `backend/db/connection.py` and `scripts/load_to_db.py`: Change `user="team10"`, `password="Team10"` to your MySQL username/password.

Test connection:

```bash
    mysql -u your_username -p
```

## Project Structure

```
urban-mobility-data-explorer-10/
├── backend/ 
├── data/
├── docs/
├── frontend/
├── scripts/
└── README.md/
```

---
## Stage 1: Data Processing and Cleaning

### What You Do

* Load raw data from `train.csv`
* Remove missing, duplicate, or invalid records
* Normalize timestamps and coordinates
* Add **derived features**, such as:
    * Trip speed = distance / duration
    * Fare per km
    * Trip hour (from pickup time)
* Log or print excluded records

### How To Do It

1. Go to backend:

    ```bash
    cd backend
    ```

2. Place your raw dataset at `data/raw/train.csv`.

3. Run the cleaning script:

    ```bash
    python scripts/clean_data.py
    ```

    - This script reads from `data/raw/train.csv`, writes any cleaning issues to `data/logs/cleaning_issues.csv`, and outputs the cleaned data to `data/processed/trips_cleaned.csv`.

4. Load the cleaned data into the database:

    ```bash
    python scripts/load_to_db.py
    ```

    - This script reads from `data/processed/trips_cleaned.csv` and inserts the records into your database.

5. The data is now ready for use in the application.

---

## Stage 2: Database Design and Implementation

### What You Do

* Use **MYSQL**
* Create table `trips` with columns like:

    ```sql
    DROP TABLE IF EXISTS trips;

    CREATE TABLE IF NOT EXISTS trips (
        id VARCHAR(36) PRIMARY KEY,
        vendor_id INT,
        pickup_datetime TIMESTAMP NOT NULL,
        dropoff_datetime TIMESTAMP NOT NULL,
        passenger_count INT,
        pickup_longitude DOUBLE PRECISION,
        pickup_latitude DOUBLE PRECISION,
        dropoff_longitude DOUBLE PRECISION,
        dropoff_latitude DOUBLE PRECISION,
        trip_duration INT,
        fare_amount DECIMAL(10,2),
        tip_amount DECIMAL(10,2),
        total_amount DECIMAL(10,2),
        trip_speed_km_hr DOUBLE PRECISION,
        fare_per_km DOUBLE PRECISION,
        trip_hour INT,
        is_rush_hour BOOLEAN
    );

    CREATE INDEX idx_trips_pickup_time ON trips (pickup_datetime);
    CREATE INDEX idx_trips_speed ON trips (trip_speed_km_hr);
    CREATE INDEX idx_trips_pickup_loc ON trips (pickup_latitude, pickup_longitude);
    ```

* Add proper indexing for faster queries which of all these are in the backend/db/schema.

## Stage 3: Backend API

### What You Do

* Built REST API endpoints in Express:

    * `/api/trips` - get list of trips
    * `/api/trips/summary` - get summary stats

### How To Do It

1. Run backend server:

     ```bash
     python3 app.py
     ```
2. Visit or use postman to get some trips:

     ```
     http://localhost:5000/api/trips
     ```
NB: First install the dependencies for the framework used for backend i.e. Flask and mysql

---

## Stage 4: Frontend Dashboard

### What You Do

* Build pages:

    * `Dashboard` - main page
    * `TripList` - table of trips
    * `TripSummaryChart` - show summary stats
    * `Heatmap` - visualize pickup/dropoff patterns
    * `Filters` - filter by time, distance, or fare
    * `TripDetails` - detailed info on one trip

### How To Do It

### Frontend

1. Go to frontend:

     ```bash
     cd frontend
     
     ```
2. Visit:

     ```
     http://0.0.0.0:8000/
     ```
3. You’ll see the dashboard.

---

## Setup Summary

### Backend

```bash
cd backend
pip install requirements.txt
python3 app.py
```

### Frontend

```bash
cd frontend
python -m http.server 8000
```

## Database Setup: 

Start MySQL server.
Create database: 

``` bash
mysql -u your_username -p
CREATE DATABASE trips;

```

---

## Folder Guide

```
backend/
│   ├── db/connection.py
│   ├── db/schema.sql
│   ├── routes/trips.py
│   └── app.py
│   └── requirements.txt
data/
│   ├── logs/cleaning_issues.csv
│   ├── processed/trips_cleaned.csv
│   ├── raw/train.csv
docs/
│   ├── documentation
frontend/
│   ├── js/dashboard.js
│   ├── css/styles.css
│   ├── lib/chat.umd.min.js
│   ├── pages/details.html
│   └── index.html
scripts/
│   ├── clean_data.py
│   ├── load_to_db.py
└── README.md/
```

---

## Demo Video (to include)



---
