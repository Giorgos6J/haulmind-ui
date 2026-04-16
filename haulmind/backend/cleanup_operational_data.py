import sqlite3

conn = sqlite3.connect("haulmind.db")
cursor = conn.cursor()

cursor.execute("DELETE FROM trip_actuals")
print(f"Deleted actuals: {cursor.rowcount}")

cursor.execute("DELETE FROM predictions")
print(f"Deleted predictions: {cursor.rowcount}")

cursor.execute("DELETE FROM bookings")
print(f"Deleted bookings: {cursor.rowcount}")

conn.commit()
conn.close()

print("Operational data reset complete. Vehicles kept.")
