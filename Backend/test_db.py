from database import get_connection

try:
    connection = get_connection()
    print("✅ Database connected successfully!")

    connection.close()
    print("✅ Database connection closed.")

except Exception as e:
    print("❌ Database connection failed!")
    print(e)