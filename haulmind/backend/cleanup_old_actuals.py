import sqlite3

conn = sqlite3.connect("haulmind.db")
cursor = conn.cursor()

cursor.execute("DELETE FROM trip_actuals WHERE actual_cost IS NULL")
deleted = cursor.rowcount

conn.commit()
conn.close()

print(f"Deleted {deleted} old demo actual rows.")
