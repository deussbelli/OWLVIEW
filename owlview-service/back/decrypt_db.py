import sqlcipher3 as sqlite3
import os
from dotenv import load_dotenv
load_dotenv()

ENCRYPTED_DB = os.getenv("DB_NAME")
DECRYPTED_DB = r"C:\Users\sitis\OneDrive\Рабочий стол\CourseWork\owlview-service\back\decrypted_main.db"

DB_KEY = os.getenv("DB_ENCRYPTION_KEY")

def decrypt_database():
    conn = sqlite3.connect(ENCRYPTED_DB)
    conn.execute(f"PRAGMA key = '{DB_KEY}'")

    conn.execute(f"ATTACH DATABASE '{DECRYPTED_DB}' AS plaintext KEY '';")

    conn.execute("SELECT sqlcipher_export('plaintext');")
    conn.execute("DETACH DATABASE plaintext;")
    conn.close()

if __name__ == "__main__":
    decrypt_database()
