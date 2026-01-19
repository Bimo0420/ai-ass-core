
import os
import psycopg2

POSTGRES_URL = os.getenv(
    "POSTGRES_URL",
    (
        f"postgresql://{os.getenv('POSTGRES_USER', 'postgres')}:"
        f"{os.getenv('POSTGRES_PASSWORD', 'password')}"
        f"@{os.getenv('POSTGRES_HOST', 'localhost')}:"
        f"{os.getenv('POSTGRES_PORT', '5432')}/"
        f"{os.getenv('POSTGRES_DB', 'postgres')}"
    )
)

def check_schema():
    try:
        conn = psycopg2.connect(POSTGRES_URL)
        cur = conn.cursor()
        
        # Check tables
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
        tables = cur.fetchall()
        print(f"Tables: {tables}")
        
        for table in tables:
            tname = table[0]
            cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{tname}';")
            cols = cur.fetchall()
            print(f"Columns in {tname}: {cols}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_schema()
