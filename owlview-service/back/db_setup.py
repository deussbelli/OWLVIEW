import sqlcipher3 as sqlite3
import bcrypt
import base64
import os
from typing import Union
from dotenv import load_dotenv

load_dotenv()

DB_NAME = os.getenv("DB_NAME")
DB_KEY = os.getenv("DB_ENCRYPTION_KEY")

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.execute(f"PRAGMA key = '{DB_KEY}'")
    return conn

def hash_password(password: str) -> str:
    if not isinstance(password, str) or not password.strip():
        raise ValueError("Пароль має бути непорожнім рядком")
    try:
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())  
        return base64.b64encode(hashed).decode('utf-8')
    except Exception as e:
        raise RuntimeError(f"Помилка хешування пароля: {str(e)}")


def verify_password(plain_password: str, hashed_password: Union[str, bytes]) -> bool:
    if not plain_password:
        raise ValueError("Простий пароль не може бути пустим")
    if not hashed_password:
        raise ValueError("Хешований пароль не може бути порожнім")
    try:
        if isinstance(hashed_password, str):
            hashed_bytes = base64.b64decode(hashed_password.encode('utf-8'))
        else:
            hashed_bytes = hashed_password
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_bytes)
    except (TypeError, ValueError) as e:
        raise TypeError(f"Недійсний формат пароля: {str(e)}")
    except Exception as e:
        raise RuntimeError(f"Помилка підтвердження пароля: {str(e)}")


def create_tables():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS global_user_seq (
        global_id INTEGER PRIMARY KEY AUTOINCREMENT
    );
    """
    )
    cursor.execute(
        """
    INSERT OR IGNORE INTO global_user_seq (global_id) VALUES (0);
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY,
            email TEXT UNIQUE,
            password TEXT,
            name TEXT,
            surname TEXT,
            gender TEXT,
            birth_date TEXT,
            phone_number TEXT,
            rating INTEGER DEFAULT 0,
            registration_date TEXT DEFAULT CURRENT_TIMESTAMP,
            notification_status INTEGER DEFAULT 0,
            is_verified INTEGER DEFAULT 0,
            is_admin INTEGER DEFAULT 1,
            is_blocked INTEGER DEFAULT 0,
            is_deleted INTEGER DEFAULT 0,
            authentication_by_admin INTEGER DEFAULT 0,
            points INTEGER DEFAULT 0, 
            country TEXT,
            region TEXT,
            city TEXT,
            relationship_status TEXT,
            attitude_to_smoking TEXT,
            attitude_to_alcohol TEXT,
            attitude_to_drugs TEXT,
            education TEXT,
            occupation TEXT,
            login_attempts INTEGER DEFAULT 0,
            vip INTEGER DEFAULT 1
    );
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY,
        email TEXT UNIQUE,
        password TEXT,
        name TEXT,
        surname TEXT,
        gender TEXT,
        birth_date TEXT,
        phone_number TEXT,
        rating INTEGER DEFAULT 0,
        registration_date TEXT DEFAULT CURRENT_TIMESTAMP,
        notification_status INTEGER DEFAULT 0,
        is_verified INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0,
        is_blocked INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        authentication_by_admin INTEGER DEFAULT 0,
        points INTEGER DEFAULT 0, 
        country TEXT,
        region TEXT,
        city TEXT,
        relationship_status TEXT,
        attitude_to_smoking TEXT,
        attitude_to_alcohol TEXT,
        attitude_to_drugs TEXT,
        education TEXT,
        occupation TEXT,
        login_attempts INTEGER DEFAULT 0,
        vip INTEGER DEFAULT 0
    );
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS organizations (
        id INTEGER PRIMARY KEY,
        organization_email TEXT UNIQUE,
        organization_password TEXT,
        organization_name TEXT,
        country TEXT,
        region TEXT,
        city TEXT,
        organization_head_name TEXT,
        organization_head_surname TEXT,
        organization_head_gender TEXT,
        organization_phone_number TEXT,
        rating INTEGER DEFAULT 0,
        registration_date TEXT DEFAULT CURRENT_TIMESTAMP,
        notification_status INTEGER DEFAULT 0,
        is_verified INTEGER DEFAULT 0,                   
        is_admin INTEGER DEFAULT 0,
        is_blocked INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        authentication_by_admin INTEGER DEFAULT 0,
        points INTEGER DEFAULT 0,
        organization_type TEXT,
        organization_registration_date TEXT,
        number_of_employees TEXT,
        organization_registration_goal TEXT,
        documents_path TEXT,
        social_links_Instagram TEXT,
        social_links_Facebook TEXT,
        social_links_Discord TEXT,
        social_links_Telegram TEXT,
        organization_website TEXT,
        login_attempts INTEGER DEFAULT 0,
        vip INTEGER DEFAULT 1
    );
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS user_blocks (
        id INTEGER PRIMARY KEY,
        who_blocked INTEGER,
        who_is_blocked INTEGER,
        block_date TEXT,
        block_time TEXT,
        end_date TEXT,
        end_time TEXT,
        reason TEXT
    );
    """
    )

    cursor.execute(
        """
     CREATE TABLE IF NOT EXISTS surveys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER,                
        survey_id TEXT UNIQUE,           
        survey_name TEXT,                
        status TEXT DEFAULT 'черновик',  
        reward REAL DEFAULT 0,           
        time_needed INTEGER DEFAULT 0,   
        start_date TEXT,                 
        end_date TEXT,                   
        password_protected TEXT,         
        password TEXT,                   
        invited_respondents TEXT,        
        survey_folder_link TEXT,         
        answers_folder_link TEXT,        
        anketa_folder_link TEXT,         
        preview_link TEXT,               
        creation_date TEXT,                                 
        description TEXT,    
        logo_link TEXT,                         
        questions_shuffle TEXT DEFAULT 'нет',   
        answers_shuffle TEXT DEFAULT 'нет',     
        display_mode TEXT DEFAULT 'single',     
        FOREIGN KEY (owner_id) REFERENCES clients (id),
        FOREIGN KEY (owner_id) REFERENCES admins (id),
        FOREIGN KEY (owner_id) REFERENCES organizations (id)
    );
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS survey_invites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        survey_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        invite_date TEXT,
        status TEXT DEFAULT 'invited',
        pass_date TEXT,         
        reward_claimed INTEGER DEFAULT 0,
        current_question INTEGER DEFAULT 0,
        partial_answers TEXT   
    );
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS blockchain_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            block_hash TEXT UNIQUE,
            previous_hash TEXT,
            timestamp TEXT,
            survey_id TEXT,
            data_hash TEXT,
            nonce INTEGER,
            FOREIGN KEY (survey_id) REFERENCES surveys (survey_id)
        );
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS blockchain_responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            block_hash TEXT,
            survey_id TEXT,
            user_id INTEGER,
            response_hash TEXT,
            timestamp TEXT,
            FOREIGN KEY (block_hash) REFERENCES blockchain_blocks (block_hash),
            FOREIGN KEY (survey_id) REFERENCES surveys (survey_id)
        );
        """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS tokens (
        user_id INTEGER PRIMARY KEY,
        token TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS verification_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        code TEXT NOT NULL,
        created_at DATETIME NOT NULL
    );

    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS withdrawals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        equivalent_uah REAL NOT NULL,
        type TEXT NOT NULL, 
        phone_number TEXT,
        charity_link TEXT,
        created_at TEXT NOT NULL,
        status TEXT DEFAULT 'pending'
    );
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS recharge_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER NOT NULL,
        organization_name TEXT NOT NULL,
        current_points INTEGER NOT NULL,
        requested_points INTEGER NOT NULL,
        equivalent_uah REAL NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        status TEXT DEFAULT 'pending', 
        admin_id INTEGER, 
        admin_comment TEXT, 
        FOREIGN KEY (organization_id) REFERENCES organizations(id),
        FOREIGN KEY (admin_id) REFERENCES admins(id)
    );
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS withdrawals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        amount INTEGER NOT NULL,
        equivalent_uah REAL NOT NULL,
        type TEXT NOT NULL, -- mobile/charity
        phone_number TEXT,
        charity_link TEXT,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (user_id) REFERENCES global_users(global_id)
    );

    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS tariffs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vipNumber INTEGER NOT NULL,
        price REAL NOT NULL,
        duration INTEGER NOT NULL, 
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        questionTypes TEXT, 
        status TEXT DEFAULT 'Черновик'
    );
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS user_tariffs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        tariff_id INTEGER NOT NULL,
        purchase_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (user_id) REFERENCES global_users (global_id),
        FOREIGN KEY (tariff_id) REFERENCES tariffs (id)
    );
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        sender_email TEXT NOT NULL,
        recipient_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        text TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT DEFAULT 'new',
        deleted INTEGER DEFAULT 0,
        read INTEGER DEFAULT 0,
        FOREIGN KEY (sender_id) REFERENCES global_users (global_id),
        FOREIGN KEY (recipient_id) REFERENCES global_users (global_id)
    );
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS system_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_type TEXT,          
        user_id INTEGER,        
        project_id INTEGER,     
        log_date DATETIME,      
        description TEXT        
    );
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        source_url TEXT,
        published_at TEXT NOT NULL,
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users(id)
    );
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel TEXT NOT NULL,        
        recipients TEXT NOT NULL,      
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        image_link TEXT,               
        signature TEXT,                
        created_by INTEGER NOT NULL,   
        created_at TEXT NOT NULL,      
        recipients_count INTEGER DEFAULT 0,                    
        read_count INTEGER DEFAULT 0   
    );
    """
    )

    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS notification_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        notification_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,          
        viewed_at TEXT NOT NULL,            
        UNIQUE(notification_id, user_id)    
    );
    """
    )

    try:

        def insert_admin():
            cursor.execute("INSERT INTO global_user_seq DEFAULT VALUES;")
            admin_id = cursor.lastrowid
            cursor.execute(
                """
            INSERT OR IGNORE INTO admins (
                id, email, password, name, surname, gender, birth_date, phone_number,
                rating, notification_status, is_verified, is_admin, is_blocked,
                is_deleted, authentication_by_admin, points,
                country, region, city,
                relationship_status, attitude_to_smoking, attitude_to_alcohol,
                attitude_to_drugs, education, occupation,
                login_attempts, vip, registration_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
            """,
                (
                    admin_id,
                    "admin@gmail.com",
                    hash_password("admin"),
                    "Ганна",
                    "Миколайчик",
                    "жінка",
                    "1985-01-01",
                    "+380991112233",
                    100,
                    1,
                    1,
                    1,
                    0,
                    0,
                    0,
                    500,
                    "",
                    "Львівська",
                    "Львів",
                    "у шлюбі",
                    "негативно",
                    "помірно",
                    "негативно",
                    "вище",
                    "адміністратор",
                    0,
                    1,
                ),
            )

        def insert_client():
            cursor.execute("INSERT INTO global_user_seq DEFAULT VALUES;")
            client_id = cursor.lastrowid
            cursor.execute(
                """
            INSERT OR IGNORE INTO clients (
                id, email, password, name, surname, gender, birth_date, phone_number,
                rating, notification_status, is_verified, is_admin, is_blocked,
                is_deleted, authentication_by_admin, points,
                country, region, city,
                relationship_status, attitude_to_smoking, attitude_to_alcohol,
                attitude_to_drugs, education, occupation,
                login_attempts, vip, registration_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
            """,
                (
                    client_id,
                    "client@gmail.com",
                    hash_password("client"),
                    "Ольга",
                    "Миколайчук",
                    "жінка",
                    "1992-03-15",
                    "+380991112244",
                    80,
                    1,
                    1,
                    0,
                    0,
                    0,
                    0,
                    200,
                    "Україна",
                    "Київська",
                    "Київ",
                    "не заміжня",
                    "нейтрально",
                    "помірно",
                    "негативно",
                    "середнє спеціальне",
                    "маркетолог",
                    1,
                    0,
                ),
            )

        def insert_organization():
            cursor.execute("INSERT INTO global_user_seq DEFAULT VALUES;")
            org_id = cursor.lastrowid
            cursor.execute(
                """
            INSERT OR IGNORE INTO organizations (
                id, organization_email, organization_password,
                organization_name, country, region, city,
                organization_head_name, organization_head_surname,
                organization_head_gender, organization_phone_number,
                rating, registration_date, notification_status, is_verified,
                is_admin, is_blocked, is_deleted, authentication_by_admin, points,
                organization_type, organization_registration_date, number_of_employees,
                organization_registration_goal, documents_path,
                social_links_Instagram, social_links_Facebook, social_links_Discord,
                social_links_Telegram, organization_website,
                login_attempts, vip
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
                (
                    org_id,
                    "org@gmail.com",
                    hash_password("org"),
                    "Test Organization",
                    "Україна",
                    "Дніпропетровська",
                    "Дніпро",
                    "Ірина",
                    "Білік",
                    "жінка",
                    "+380991112255",
                    90,
                    1,
                    1,
                    0,
                    0,
                    0,
                    1,
                    300,
                    "Приватна компанія",
                    "2020-01-01",
                    "50",
                    "Збір даних та аналітика",
                    "/path/to/docs",
                    "https://instagram.com/org",
                    "https://facebook.com/org",
                    "https://discord.com/org",
                    "https://t.me/org",
                    "https://org.com",
                    2,
                    1,
                ),
            )

        insert_admin()
        insert_client()
        insert_organization()
        conn.commit()
    except Exception as e:
        print("Помилка при додаванні початкових даних:", e)

    conn.close()
    print(
        "Таблиці (admins, clients, organizations) та global_user_seq створені або вже існують."
    )


def create_global_view_with_all_fields():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("DROP VIEW IF EXISTS global_users;")

    cursor.execute(
        """
    CREATE VIEW global_users AS
    SELECT
        id AS global_id,
        email,
        password,
        name,
        surname,
        gender,
        birth_date,
        phone_number,
        rating,
        registration_date,
        notification_status,
        is_verified,
        is_admin,
        is_blocked,
        is_deleted,
        authentication_by_admin,
        points,
        country,
        region,
        city,
        relationship_status,
        attitude_to_smoking,
        attitude_to_alcohol,
        attitude_to_drugs,
        education,
        occupation,
        login_attempts,
        vip,
        NULL AS organization_name,
        NULL AS organization_head_name,
        NULL AS organization_head_surname,
        NULL AS organization_head_gender,
        NULL AS organization_phone_number,
        NULL AS organization_type,
        NULL AS organization_registration_date,
        NULL AS number_of_employees,
        NULL AS organization_registration_goal,
        NULL AS documents_path,
        NULL AS social_links_Instagram,
        NULL AS social_links_Facebook,
        NULL AS social_links_Discord,
        NULL AS social_links_Telegram,
        NULL AS organization_website,
        'admin' AS role
    FROM admins
    UNION ALL
    SELECT
        id AS global_id,
        email,
        password,
        name,
        surname,
        gender,
        birth_date,
        phone_number,
        rating,
        registration_date,
        notification_status,
        is_verified,
        is_admin,
        is_blocked,
        is_deleted,
        authentication_by_admin,
        points,
        country,
        region,
        city,
        relationship_status,
        attitude_to_smoking,
        attitude_to_alcohol,
        attitude_to_drugs,
        education,
        occupation,
        login_attempts,
        vip,
        NULL AS organization_name,
        NULL AS organization_head_name,
        NULL AS organization_head_surname,
        NULL AS organization_head_gender,
        NULL AS organization_phone_number,
        NULL AS organization_type,
        NULL AS organization_registration_date,
        NULL AS number_of_employees,
        NULL AS organization_registration_goal,
        NULL AS documents_path,
        NULL AS social_links_Instagram,
        NULL AS social_links_Facebook,
        NULL AS social_links_Discord,
        NULL AS social_links_Telegram,
        NULL AS organization_website,
        'client' AS role
    FROM clients
    UNION ALL
    SELECT
        id AS global_id,
        organization_email AS email,
        organization_password AS password,
        organization_name AS name,
        NULL AS surname,
        NULL AS gender,
        NULL AS birth_date,
        organization_phone_number AS phone_number,
        rating,
        registration_date,
        notification_status,
        is_verified,
        is_admin,
        is_blocked,
        is_deleted,
        authentication_by_admin,
        points,
        country,
        region,
        city,
        NULL AS relationship_status,
        NULL AS attitude_to_smoking,
        NULL AS attitude_to_alcohol,
        NULL AS attitude_to_drugs,
        NULL AS education,
        NULL AS occupation,
        login_attempts,
        vip,
        organization_name,
        organization_head_name,
        organization_head_surname,
        organization_head_gender,
        organization_phone_number,
        organization_type,
        organization_registration_date,
        number_of_employees,
        organization_registration_goal,
        documents_path,
        social_links_Instagram,
        social_links_Facebook,
        social_links_Discord,
        social_links_Telegram,
        organization_website,
        'organization' AS role
    FROM organizations;
    """
    )

    conn.commit()
    conn.close()
    print("Представлення global_users з полями всіх таблиць створено.")


if __name__ == "__main__":
    create_tables()
