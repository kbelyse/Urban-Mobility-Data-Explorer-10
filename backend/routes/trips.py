from flask import Blueprint, request, jsonify
from db.connection import connect_db

bp = Blueprint('trips', __name__, url_prefix='/api/trips')

def build_filtered_query(base_query, params, include_limit=True):
    query = base_query + " WHERE TRUE"
    filter_params = {}

    vendor_id = request.args.get("vendor_id")
    passenger_count = request.args.get("passenger_count")
    is_rush_hour = request.args.get("is_rush_hour")
    min_fare = request.args.get("min_fare")
    start = request.args.get("start")
    end = request.args.get("end")
    search = request.args.get("search")
    
    if vendor_id:
        query += " AND vendor_id = %(vendor_id)s"
        filter_params["vendor_id"] = int(vendor_id)
    if passenger_count:
        query += " AND passenger_count = %(passenger_count)s"
        filter_params["passenger_count"] = int(passenger_count)
    if is_rush_hour:
        if is_rush_hour.lower() == 'true':
            query += " AND is_rush_hour = 1"
            filter_params["is_rush_hour"] = 1
        elif is_rush_hour.lower() == 'false':
            query += " AND is_rush_hour = 0"
            filter_params["is_rush_hour"] = 0
    if min_fare:
        query += " AND (fare_amount >= %(min_fare)s OR fare_amount IS NULL)"
        filter_params["min_fare"] = float(min_fare)
    if start:
        query += " AND pickup_datetime >= %(start)s"
        filter_params["start"] = start
    if end:
        query += " AND pickup_datetime <= %(end)s"
        filter_params["end"] = end
    if search:
        search_term = f"%{search}%"
        query += " AND (id LIKE %(search)s OR pickup_datetime LIKE %(search)s)"
        filter_params["search"] = search_term
    
    if include_limit:
        sort_by = request.args.get("sort_by", "pickup_datetime")
        allowed_sort = ['pickup_datetime', 'trip_duration', 'fare_amount', 'trip_speed_km_hr']
        if sort_by not in allowed_sort:
            sort_by = 'pickup_datetime'
        sort_dir = request.args.get("sort_dir", "ASC").upper()
        if sort_dir not in ['ASC', 'DESC']:
            sort_dir = 'ASC'
        query += f" ORDER BY {sort_by} {sort_dir}"

        limit = int(request.args.get("limit", 100))
        offset = int(request.args.get("offset", 0))
        query += " LIMIT %(limit)s OFFSET %(offset)s"
        filter_params["limit"] = limit
        filter_params["offset"] = offset
    
    params.update(filter_params)
    return query

@bp.route("/")
def get_trips():
    """Return trip records"""
    params = {}
    query = build_filtered_query("SELECT * FROM trips", params)
    
    conn = connect_db()
    cur = conn.cursor()
    try:
        cur.execute(query, params)
        cols = [c[0] for c in cur.description]
        rows = cur.fetchall()
        result = [dict(zip(cols, row)) for row in rows]
        return jsonify(result)
    finally:
        cur.close()
        conn.close()

@bp.route("/summary")
def summary():
    """Return metrics"""
    params = {}
    query = build_filtered_query(
        "SELECT COUNT(*) AS trip_count, "
        "AVG(trip_duration) AS avg_duration, "
        "AVG(trip_speed_km_hr) AS avg_speed, "
        "AVG(fare_amount) AS avg_fare "
        "FROM trips", 
        params, 
        include_limit=False
    )
    
    conn = connect_db()
    cur = conn.cursor()
    try:
        cur.execute(query, params)
        row = cur.fetchone()
        return jsonify({
            "trip_count": int(row[0]) if row[0] else 0,
            "avg_duration": float(row[1]) if row[1] else 0.0,
            "avg_speed": float(row[2]) if row[2] else 0.0,
            "avg_fare": float(row[3]) if row[3] else 0.0
        })
    finally:
        cur.close()
        conn.close()
