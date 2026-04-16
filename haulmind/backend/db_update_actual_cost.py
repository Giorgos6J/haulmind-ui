import sqlite3

conn = sqlite3.connect("haulmind.db")
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(trip_actuals)")
columns = [row[1] for row in cursor.fetchall()]

if "actual_cost" not in columns:
    cursor.execute("ALTER TABLE trip_actuals ADD COLUMN actual_cost FLOAT")
    print("Column actual_cost added successfully.")
else:
    print("Column actual_cost already exists.")

conn.commit()

cursor.execute("PRAGMA table_info(trip_actuals)")
for row in cursor.fetchall():
    print(row)

conn.close()
