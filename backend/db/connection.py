import mysql.connector

def connect_db():
    return mysql.connector.connect(
        host="localhost",
        user="team10",
        password="Team10",
        database="trips",
        port=3306,
        auth_plugin='mysql_native_password',
    )
