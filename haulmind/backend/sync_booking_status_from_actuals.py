import sqlite3

conn = sqlite3.connect("haulmind.db")
cursor = conn.cursor()

cursor.execute("""
UPDATE bookings
SET status = 'completed'
WHERE id IN (
    SELECT booking_id
    FROM trip_actuals
    WHERE is_deleted = 0
)
""")

print(f"Updated bookings: {cursor.rowcount}")

conn.commit()
conn.close()
