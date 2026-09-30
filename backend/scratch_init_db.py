import psycopg2

try:
    conn = psycopg2.connect('postgresql://postgres:postgres@127.0.0.1:5433/postgres')
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT datname FROM pg_database WHERE datname='meeting_summarizer'")
    if not cur.fetchone():
        cur.execute("CREATE DATABASE meeting_summarizer")
        print("Successfully created database meeting_summarizer")
    else:
        print("Database meeting_summarizer already exists")
    conn.close()
except Exception as e:
    print("Database setup error:", e)
