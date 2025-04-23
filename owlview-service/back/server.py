import os
import shutil
import json
import time
import re
import io
import uuid
import base64
import random
import secrets
import traceback
import bcrypt
import smtplib
import requests
import jwt
import hashlib
import bleach
import sqlcipher3 as sqlite3
from functools import wraps
from threading import Lock
from typing import Union
from datetime import datetime, timedelta, timezone
from flask import Flask, request, jsonify, g, send_file, Response
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from email.message import EmailMessage
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from db_setup import create_tables, create_global_view_with_all_fields
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
import google.generativeai as genai
from jwt.exceptions import PyJWTError
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.fernet import Fernet

def sanitize_input(data):
    allowed_tags = ['img']
    allowed_attrs = {
        'img': ['src', 'alt', 'title']
    }
    if isinstance(data, str):
        return bleach.clean(data, tags=allowed_tags, attributes=allowed_attrs, strip=True)
    elif isinstance(data, dict):
        return {k: sanitize_input(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_input(i) for i in data]
    return data

db_lock = Lock()
load_dotenv(".env")

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "uploads"
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173"], "supports_credentials": True}})

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["100 per minute"],
)

BASE_CLIENT_SURVEY = os.getenv("BASE_CLIENT_SURVEY")
SECRET_KEY  = os.getenv("SECRET_KEY")
DB_NAME = os.getenv("DB_NAME")
DB_KEY = os.getenv("DB_ENCRYPTION_KEY")
BASE_ADMIN_SURVEY = os.getenv("BASE_ADMIN_SURVEY")
BASE_ORG_SURVEY = os.getenv("BASE_ORG_SURVEY")
BASE_ORG_DOCUMENTS = os.getenv("BASE_ORG_DOCUMENTS")
TOKEN_EXPIRY_DAYS = int(os.getenv("TOKEN_EXPIRY_DAYS", 3))
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
AI_MODEL = os.getenv("AI_MODEL")

genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel(AI_MODEL)

os.makedirs(BASE_CLIENT_SURVEY, exist_ok=True)
os.makedirs(BASE_ADMIN_SURVEY, exist_ok=True)
os.makedirs(BASE_ORG_SURVEY, exist_ok=True)
os.makedirs(BASE_ORG_DOCUMENTS, exist_ok=True)
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

fernet = Fernet(ENCRYPTION_KEY)

def encrypt_data(plain_text: str) -> str:
    encrypted = fernet.encrypt(plain_text.encode('utf-8'))
    return encrypted.decode('utf-8')


def decrypt_data(encrypted_text: str) -> str:
    decrypted = fernet.decrypt(encrypted_text.encode('utf-8'))
    return decrypted.decode('utf-8')


def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.execute(f"PRAGMA key = '{DB_KEY}'")
    return conn

def get_base_survey_path_by_role(role):
    if role == "client":
        return BASE_CLIENT_SURVEY
    elif role == "admin":
        return BASE_ADMIN_SURVEY
    elif role == "organization":
        return BASE_ORG_SURVEY
    else:
        return BASE_CLIENT_SURVEY

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



def generate_token(user_id):
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRY_DAYS),
        "iat": datetime.now(timezone.utc)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token

def save_token(user_id, token):
    if token.startswith("Bearer "):
        token = token.split(" ")[1]
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"Зберігаємо токен {token} для користувача {user_id}")
    cursor.execute("""
        INSERT OR REPLACE INTO tokens (user_id, token, created_at)
        VALUES (?, ?, ?)
    """, (user_id, token, now))
    conn.commit()
    conn.close()

def get_token_info(token):
    print(f"Шукаємо токен у базі: {token}")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, created_at FROM tokens WHERE token = ?", (token,))
    result = cursor.fetchone()
    conn.close()
    print(f"Результат із бази для токена {token}: {result}")
    return result

def delete_token(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tokens WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    print(f"Токен для користувача {user_id} видалено.")

def is_token_valid(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        print(f"Токен валідний, payload: {payload}")
        return True, payload["user_id"]
    except jwt.ExpiredSignatureError:
        print("Токен протерміновано.")
        return False, None
    except jwt.InvalidTokenError:
        print("Недійсний токен.")
        return False, None

@app.before_request
def authorize():
    if request.form:
        g.cleaned_form = sanitize_input(request.form.to_dict(flat=True))
    if request.args:
        g.cleaned_args = sanitize_input(request.args.to_dict(flat=True))
    if request.is_json:
        g.cleaned_json = sanitize_input(request.get_json())
    else:
        g.cleaned_json = None

    public_endpoints = [
        'register',
        'api_login',
        'static',
        'logout',
        'google_auth',
    'health_check'
    ]

    if request.endpoint not in public_endpoints:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({"success": False, "message": "Токена не надано."}), 401

        if token.startswith("Bearer "):
            token = token.split(" ")[1]

        token_info = get_token_info(token)
        if not token_info:
            return jsonify({"success": False, "message": "Неправильний токен."}), 401

        user_id, created_at = token_info
        if not is_token_valid(token):
            delete_token(user_id)
            return jsonify({"success": False, "message": "Термін дії токена минув."}), 401

        g.user_id = user_id

        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT role FROM global_users WHERE global_id = ?", (user_id,))
            user_role = cursor.fetchone()
            if not user_role:
                return jsonify({"success": False, "message": "Роль користувача не знайдено."}), 404

            g.user_role = user_role[0]
        except Exception as e:
            return jsonify({"success": False, "message": f"Помилка авторизації: {e}"}), 500
        finally:
            conn.close()









def calculate_hash(index, previous_hash, timestamp, data, nonce=0):
    value = str(index) + str(previous_hash) + str(timestamp) + str(data) + str(nonce)
    return hashlib.sha256(value.encode('utf-8')).hexdigest()

def proof_of_work(index, previous_hash, timestamp, data, difficulty=2):
    nonce = 0
    computed_hash = calculate_hash(index, previous_hash, timestamp, data, nonce)
    while not computed_hash.startswith('0' * difficulty):
        nonce += 1
        computed_hash = calculate_hash(index, previous_hash, timestamp, data, nonce)
    return computed_hash, nonce

def get_last_block():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, block_hash, previous_hash, timestamp FROM blockchain_blocks ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            "index": row[0],
            "hash": row[1],
            "previous_hash": row[2],
            "timestamp": row[3]
        }
    return {
        "index": 0,
        "hash": "0" * 64,
        "previous_hash": "0" * 64,
        "timestamp": "0"
    }

def add_block(survey_id, data):
    last_block = get_last_block()
    index = last_block["index"] + 1
    timestamp = time.time()
    previous_hash = last_block["hash"]
    
    data_hash = hashlib.sha256(str(data).encode('utf-8')).hexdigest()
    
    block_hash, nonce = proof_of_work(index, previous_hash, timestamp, data_hash)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO blockchain_blocks 
        (block_hash, previous_hash, timestamp, survey_id, data_hash, nonce)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (block_hash, previous_hash, timestamp, survey_id, data_hash, nonce)
    )
    conn.commit()
    conn.close()
    
    return block_hash

def validate_blockchain():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, block_hash, previous_hash, timestamp, data_hash, nonce FROM blockchain_blocks ORDER BY id")
    blocks = cursor.fetchall()
    conn.close()
    
    previous_hash = "0" * 64 
    
    for block in blocks:
        block_id, block_hash, prev_hash, timestamp, data_hash, nonce = block
        
        if prev_hash != previous_hash:
            return False
            
        computed_hash = calculate_hash(block_id, prev_hash, timestamp, data_hash, nonce)
        if computed_hash != block_hash:
            return False
            
        previous_hash = block_hash
        
    return True

def add_response_to_blockchain(survey_id, user_id, response_data):
    timestamp = time.time()
    
    response_hash = hashlib.sha256(str(response_data).encode('utf-8')).hexdigest()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT block_hash FROM blockchain_blocks WHERE survey_id = ? ORDER BY id DESC LIMIT 1", (survey_id,))
    row = cursor.fetchone()
    
    if not row:        
        block_hash = add_block(survey_id, {"type": "survey_created", "timestamp": timestamp})
    else:
        block_hash = row[0]
       
    cursor.execute(
        """
        INSERT INTO blockchain_responses
        (block_hash, survey_id, user_id, response_hash, timestamp)
        VALUES (?, ?, ?, ?, ?)
        """,
        (block_hash, survey_id, user_id, response_hash, timestamp)
    )
    conn.commit()
    conn.close()
    
    return response_hash








@app.route('/api/health-check', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"}), 200

def custom_verify_google_token(token, client_id):
    def jwk_to_pem(jwk):
        e = base64.urlsafe_b64decode(jwk['e'] + '=' * (4 - len(jwk['e']) % 4))
        n = base64.urlsafe_b64decode(jwk['n'] + '=' * (4 - len(jwk['n']) % 4))
        e_int = int.from_bytes(e, byteorder='big')
        n_int = int.from_bytes(n, byteorder='big')

        public_numbers = RSAPublicNumbers(e=e_int, n=n_int)

        public_key = public_numbers.public_key(backend=default_backend())

        pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        return pem

    google_keys_url = "https://www.googleapis.com/oauth2/v3/certs"
    response = requests.get(google_keys_url)
    if response.status_code != 200:
        raise ValueError("Не вдалося отримати відкриті ключі Google")

    jwks = response.json()

    header = jwt.get_unverified_header(token)
    kid = header.get("kid")

    jwk = None
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            jwk = key
            break

    if not jwk:
        raise ValueError("Для цього маркера не знайдено відповідного ключа")

    pem_key = jwk_to_pem(jwk)

    try:
        payload = jwt.decode(
            token,
            pem_key,
            algorithms=["RS256"],
            audience=client_id,
            options={
                "verify_exp": True,
                "verify_iat": False,
                "verify_nbf": False,
                "leeway": 1800
            }
        )

        if payload.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
            raise ValueError("Invalid token issuer")

        return payload

    except PyJWTError as e:
        raise ValueError(f"Invalid token: {str(e)}")


@app.route("/api/ask_ai", methods=["POST"])
def ask_ai():
    data = request.json
    prompt = data.get("prompt", "").strip()

    if not prompt:
        return jsonify({"success": False, "message": "No prompt provided"}), 400

    try:
        response = model.generate_content(prompt)
        text_response = response.text.strip() if response else "Модель не відповіла."

        return jsonify({
            "success": True,
            "response": text_response
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
    

@app.route('/api/google-auth', methods=['POST'])
def google_auth():
    try:
        data = request.get_json()
        google_token = data.get('token')

        if not google_token:
            return jsonify({"success": False, "message": "Немає Google token"}), 400

        CLIENT_ID = "114859295968-5kcdem1h1jp4fquuhpp9oig1o00pp7cc.apps.googleusercontent.com"

        try:
            idinfo = custom_verify_google_token(google_token, CLIENT_ID)
            user_email = idinfo["email"]
            user_google_id = idinfo["sub"]
            user_name = idinfo.get("name", "")
            user_picture = idinfo.get("picture", "")
            print("Токен Google пройшов верифікацію")
        except ValueError as e:
            print(f"Помилка верифікації токена Google: {str(e)}")
            return jsonify({
                "success": False,
                "message": f"Недійсний Google токен: {str(e)}"
            }), 401

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, email, is_blocked FROM clients
            WHERE email = ?
        """, (user_email,))
        client_data = cursor.fetchone()

        cursor.execute("""
            SELECT id, organization_email, is_blocked FROM organizations
            WHERE organization_email = ?
        """, (user_email,))
        org_data = cursor.fetchone()

        user_id = None
        role = None
        is_blocked = 0

        if client_data:
            user_id = client_data[0]
            is_blocked = client_data[2]
            role = "client"
        elif org_data:
            user_id = org_data[0]
            is_blocked = org_data[2]
            role = "organization"
        else:
            cursor.execute("INSERT INTO global_user_seq DEFAULT VALUES;")
            conn.commit()
            new_global_id = cursor.lastrowid

            fake_password = "google_oauth_only"

            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute("""
                INSERT INTO clients (
                    id, email, password, name, surname,
                    registration_date, is_verified
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                new_global_id,
                user_email, fake_password,
                user_name, "",
                now,
                1
            ))
            conn.commit()

            user_id = new_global_id
            role = "client"
            is_blocked = 0

        if is_blocked == 1:
            return jsonify({
                "success": False,
                "message": "Ваш обліковий запис заблоковано."
            }), 403

        cursor.execute("DELETE FROM tokens WHERE user_id = ?", (user_id,))
        conn.commit()
        token = generate_token(user_id)
        save_token(user_id, token)

        conn.close()

        user = {
            "id": user_id,
            "email": user_email,
            "role": role,
            "token": token,
            "is_verified": 1,
            "google_picture": user_picture
        }

        return jsonify({
            "success": True,
            "message": "Успішний вхід через Google",
            "user": user
        })

    except ValueError:
        return jsonify({"success": False, "message": "Недійсний Google токен"}), 401
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500







def generate_verification_code():
    return str(random.randint(100000, 999999))

def send_verification_email(to_email, verification_code):
    sender_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    subject = "Код підтвердження для OwlView Service"
    message_body = f"""
    Вітаємо!

    Ваш код підтвердження для сервісу OwlView: {verification_code}

    Щоб завершити реєстрацію, введіть цей код у формі підтвердження.

    Якщо ви не запитували цей код, просто проігноруйте цей лист.

    З повагою,
    Команда OwlView
    """

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(message_body, 'plain'))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, smtp_password)
            server.sendmail(sender_email, to_email, msg.as_string())
            print(f"Лист успішно відправлений на {to_email}")
    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        print(f"Помилка при надсиланні листа: {e}")
        raise

@app.route('/api/request-verification', methods=['POST'])
def request_verification():
    try:
        user_id = g.user_id
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT email FROM clients WHERE id = ?
            UNION
            SELECT organization_email FROM organizations WHERE id = ?
        """, (user_id, user_id))

        result = cursor.fetchone()
        if not result:
            return jsonify({"success": False, "message": "Користувача не знайдено"}), 404

        email = result[0]
        verification_code = generate_verification_code()

        cursor.execute("""
            INSERT INTO verification_codes (user_id, code, created_at)
            VALUES (?, ?, datetime('now'))
        """, (user_id, verification_code))

        conn.commit()
        send_verification_email(email, verification_code)
        return jsonify({"success": True, "message": "Код підтвердження надіслано"})

    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        print(f"Помилка в request_verification: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/verify-code', methods=['POST'])
def verify_code():
    try:
        data = request.get_json()
        code = data.get('code')
        user_id = g.user_id
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id FROM verification_codes
            WHERE user_id = ?
            AND code = ?
            AND created_at > datetime('now', '-30 minutes')
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id, code))

        if not cursor.fetchone():
            return jsonify({
                "success": False,
                "message": "Недійсний або прострочений код підтвердження"
            }), 400

        cursor.execute("""
            UPDATE clients
            SET is_verified = 1
            WHERE id = ?
        """, (user_id,))

        cursor.execute("""
            UPDATE organizations
            SET is_verified = 1
            WHERE id = ?
        """, (user_id,))

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Перевірка електронної пошти успішна"
        })

    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/register', methods=['POST'])
def register():
    role = request.form.get("role")
    agreementChecked = request.form.get("agreementChecked")
    notificationsChecked = request.form.get("notificationsChecked")
    notification_status = 1 if notificationsChecked == "1" else 0

    if agreementChecked != "1":
        return jsonify({"success": False, "message": "Ви повинні погодитися з користувальницькою угодою!"})

    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        cursor.execute("INSERT INTO global_user_seq DEFAULT VALUES;")
        conn.commit()
        new_global_id = cursor.lastrowid

        if role == "client":
            email = request.form.get("email", "")
            password = request.form.get("password", "")
            name = request.form.get("name", "")
            surname = request.form.get("surname", "")
            gender = request.form.get("gender", "")
            birth_date = request.form.get("birth_date", "")
            phone_number = request.form.get("phone_number", "")
            country = request.form.get("country", "")
            region = request.form.get("region", "")
            city = request.form.get("city", "")
            relationship_status = request.form.get("relationship_status", "")
            attitude_to_smoking = request.form.get("attitude_to_smoking", "")
            attitude_to_alcohol = request.form.get("attitude_to_alcohol", "")
            attitude_to_drugs = request.form.get("attitude_to_drugs", "")
            education = request.form.get("education", "")
            occupation = request.form.get("occupation", "")

            hashed_pass = hash_password(password)

            cursor.execute("""
                INSERT INTO clients (
                    id,
                    email, password, name, surname, gender, birth_date, phone_number,
                    registration_date, notification_status,
                    country, region, city,
                    relationship_status, attitude_to_smoking, attitude_to_alcohol,
                    attitude_to_drugs, education, occupation,
                    vip
                )
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                new_global_id,
                email, hashed_pass, name, surname, gender, birth_date, phone_number,
                now, notification_status,
                country, region, city,
                relationship_status, attitude_to_smoking, attitude_to_alcohol,
                attitude_to_drugs, education, occupation,
                0
            ))
            conn.commit()

            client_survey_folder = os.path.join(BASE_CLIENT_SURVEY, str(new_global_id))
            os.makedirs(client_survey_folder, exist_ok=True)

            token = generate_token(new_global_id)
            save_token(new_global_id, token)
            log_event("registration_user", new_global_id, None, f"Реєстрація нового клієнта (id={new_global_id})")

            return jsonify({"success": True, "message": "Реєстрація (client) пройшла успішно", "id": new_global_id, "token": token})

        elif role == "admin":
            email = request.form.get("email", "")
            password = request.form.get("password", "")
            name = request.form.get("name", "")
            surname = request.form.get("surname", "")
            gender = request.form.get("gender", "")
            birth_date = request.form.get("birth_date", "")
            phone_number = request.form.get("phone_number", "")
            country = request.form.get("country", "")
            region = request.form.get("region", "")
            city = request.form.get("city", "")
            relationship_status = request.form.get("relationship_status", "")
            attitude_to_smoking = request.form.get("attitude_to_smoking", "")
            attitude_to_alcohol = request.form.get("attitude_to_alcohol", "")
            attitude_to_drugs = request.form.get("attitude_to_drugs", "")
            education = request.form.get("education", "")
            occupation = request.form.get("occupation", "")

            hashed_pass = hash_password(password)

            cursor.execute("""
            INSERT INTO admins (
                id,
                email, password, name, surname, gender, birth_date, phone_number,
                registration_date, notification_status,
                country, region, city,
                relationship_status, attitude_to_smoking, attitude_to_alcohol,
                attitude_to_drugs, education, occupation,
                is_admin, vip
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                new_global_id,
                email, hashed_pass, name, surname, gender, birth_date, phone_number,
                now, notification_status,
                country, region, city,
                relationship_status, attitude_to_smoking, attitude_to_alcohol,
                attitude_to_drugs, education, occupation,
                1, 1  
            ))

            conn.commit()

            admin_survey_folder = os.path.join(BASE_ADMIN_SURVEY, str(new_global_id))
            os.makedirs(admin_survey_folder, exist_ok=True)

            token = generate_token(new_global_id)
            save_token(new_global_id, token)
            log_event("registration_user", new_global_id, None, f"Реєстрація адміністратора (id={new_global_id})")

            return jsonify({"success": True, "message": "Реєстрація (admin) пройшла успішно", "id": new_global_id, "token": token})

        elif role == "organization":
            organization_email = request.form.get("organization_email", "")
            organization_password = request.form.get("organization_password", "")
            organization_name = request.form.get("organization_name", "")
            country = request.form.get("country", "")
            region = request.form.get("region", "")
            city = request.form.get("city", "")
            organization_head_name = request.form.get("organization_head_name", "")
            organization_head_surname = request.form.get("organization_head_surname", "")
            organization_head_gender = request.form.get("organization_head_gender", "")
            organization_phone_number = request.form.get("organization_phone_number", "")
            organization_type = request.form.get("organization_type", "")
            organization_registration_date = request.form.get("organization_registration_date", "")
            number_of_employees = request.form.get("number_of_employees", "")
            organization_registration_goal = request.form.get("organization_registration_goal", "")

            hashed_pass = hash_password(organization_password)

            documents_file = request.files.get("documents")
            documents_path = ""
            if documents_file:
                filename = documents_file.filename
                temp_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
                documents_file.save(temp_path)
                documents_path = temp_path

            social_links_Instagram = request.form.get("social_links_Instagram", "")
            social_links_Facebook = request.form.get("social_links_Facebook", "")
            social_links_Discord = request.form.get("social_links_Discord", "")
            social_links_Telegram = request.form.get("social_links_Telegram", "")
            organization_website = request.form.get("organization_website", "")

            cursor.execute("""
                INSERT INTO organizations (
                    id,
                    organization_email, organization_password,
                    organization_name, country, region, city,
                    organization_head_name, organization_head_surname, organization_head_gender,
                    organization_phone_number,
                    registration_date, notification_status,
                    organization_type, organization_registration_date, number_of_employees,
                    organization_registration_goal, documents_path,
                    social_links_Instagram, social_links_Facebook, social_links_Discord,
                    social_links_Telegram, organization_website,
                    vip
                )
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                new_global_id,
                organization_email, hashed_pass,
                organization_name, country, region, city,
                organization_head_name, organization_head_surname, organization_head_gender,
                organization_phone_number,
                now, notification_status,
                organization_type, organization_registration_date, number_of_employees,
                organization_registration_goal, documents_path,
                social_links_Instagram, social_links_Facebook, social_links_Discord,
                social_links_Telegram, organization_website,
                1
            ))
            conn.commit()

            org_survey_folder = os.path.join(BASE_ORG_SURVEY, str(new_global_id))
            os.makedirs(org_survey_folder, exist_ok=True)

            if documents_file:
                org_docs_folder = os.path.join(BASE_ORG_DOCUMENTS, str(new_global_id))
                os.makedirs(org_docs_folder, exist_ok=True)

                new_path = os.path.join(org_docs_folder, filename)
                os.rename(documents_path, new_path)

                cursor.execute("""
                    UPDATE organizations
                    SET documents_path=?
                    WHERE id=?
                """, (new_path, new_global_id))
                conn.commit()

            token = generate_token(new_global_id)
            save_token(new_global_id, token)
            log_event("registration_org", new_global_id, None, f"Реєстрація організації (id={new_global_id})")

            return jsonify({"success": True, "message": "Реєстрація (organization) пройшла успішно", "id": new_global_id, "token": token})

        else:
            conn.close()
            return jsonify({"success": False, "message": "Некоректна роль (role)!"})

    except Exception as e:
        log_event("error", None, None, f"Помилка при реєстрації: {str(e)}")

        conn.rollback()
        return jsonify({"success": False, "message": str(e)})

    finally:
        conn.close()

@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()
    conn = get_db_connection()
    cursor = conn.cursor()

    def check_login(table, email_field="email"):
        password_field = "organization_password" if table == "organizations" else "password"
        fields = f"id, {password_field}, is_blocked, login_attempts, "
        fields += "name, surname" if table != "organizations" else "organization_name"

        cursor.execute(f"""
            SELECT {fields}
            FROM {table}
            WHERE {email_field} = ?
        """, (email,))
        return cursor.fetchone()

    def get_block_details(user_id):
        cursor.execute("""
            SELECT block_date, block_time, end_date, end_time, reason
            FROM user_blocks
            WHERE who_is_blocked = ?
            ORDER BY id DESC
            LIMIT 1
        """, (user_id,))
        return cursor.fetchone()

    def update_login_attempts(table, user_id, attempts):
        cursor.execute(f"UPDATE {table} SET login_attempts = ? WHERE id = ?",
                      (attempts, user_id))
        conn.commit()

    def block_user_system(user_id, table):
        now = datetime.now()
        cursor.execute(f"""
            UPDATE {table}
            SET is_blocked = 1, login_attempts = 10
            WHERE id = ?
        """, (user_id,))

        cursor.execute("""
            INSERT INTO user_blocks (who_blocked, who_is_blocked, block_date,
                                   block_time, reason)
            VALUES (?, ?, ?, ?, ?)
        """, (99, user_id, now.strftime("%Y-%m-%d"),
              now.strftime("%H:%M"), "Incorrect password entry"))
        conn.commit()

    tables = [
        ("admins", "admin", "email"),
        ("clients", "client", "email"),
        ("organizations", "organization", "organization_email")
    ]

    for table, role, email_field in tables:
        user_data = check_login(table, email_field)
        if not user_data:
            continue

        user_id = user_data[0]
        db_hashed_password = user_data[1]
        is_blocked = user_data[2]
        login_attempts = user_data[3]

        if not verify_password(password, db_hashed_password):
            login_attempts += 1
            if login_attempts >= 10:
                block_user_system(user_id, table)                
                is_blocked = 1
                # conn.close()
                # return jsonify({
                #     "success": False,
                #     "message": "Користувача заблоковано через надто велику кількість неправильних спроб входу"
                # })
            else:
                update_login_attempts(table, user_id, login_attempts)
                conn.close()
                return jsonify({
                    "success": False,
                    "message": f"Невірний пароль. Залишилось спроб: {10 - login_attempts}"
                })

        update_login_attempts(table, user_id, 0)
        token = generate_token(user_id)
        save_token(user_id, token)

        user = {
            "id": user_id,
            "role": role,
            "is_blocked": is_blocked,
            "token": token
        }

        if is_blocked == 2:
            block_details = get_block_details(user_id)
            if block_details:
                block_start_date, block_start_time, block_end_date, block_end_time, reason = block_details
                user.update({
                    "block_start_date": block_start_date,
                    "block_start_time": block_start_time,
                    "block_end_date": block_end_date,
                    "block_end_time": block_end_time,
                    "reason": reason
                })

        if role == "organization":
            user["organization_name"] = user_data[4]
        else:
            user["name"] = user_data[4]
            user["surname"] = user_data[5]

        cursor.execute(f"SELECT is_verified FROM {table} WHERE id = ?", (user_id,))
        is_verified = cursor.fetchone()[0]
        user["is_verified"] = is_verified

        conn.close()
        log_event(
            log_type=f"login_{role}",
            user_id=user_id,
            project_id=None,
            description=f"Успішний вхід до системи, user_id={user_id}, role={role}"
        )

        return jsonify({
            "success": True,
            "message":"Логін успішний",
            "user": user
        })

    conn.close()
    return jsonify({
        "success": False,
        "message": "Користувача з такою поштою не знайдено"
    })

@app.route('/api/platform-stats', methods=['GET'])
def get_platform_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM admins WHERE is_deleted=0;")
        admin_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM clients WHERE is_deleted=0;")
        client_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM organizations WHERE is_deleted=0;")
        organization_count = cursor.fetchone()[0]

        total_users = admin_count + client_count + organization_count

        cursor.execute("SELECT COUNT(*) FROM surveys;")
        survey_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM survey_invites WHERE pass_date IS NOT NULL;")
        answers_count = cursor.fetchone()[0]

        conn.close()

        return jsonify({
            "success": True,
            "users": total_users,
            "admins": admin_count,
            "clients": client_count,
            "organizations": organization_count,
            "surveys": survey_count,
            "responses": answers_count
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/user-status', methods=['GET'])
def get_user_status():
    try:
        user_id = g.user_id
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                role,
                is_blocked,
                is_verified,
                authentication_by_admin
            FROM global_users
            WHERE global_id = ?
        """, (user_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({"success": False, "message": "Користувач не знайдено."}), 404

        role, is_blocked, is_verified, authentication_by_admin = row

        if role != "organization" or authentication_by_admin is None:
            authentication_by_admin = 0

        return jsonify({
            "role": role,
            "is_blocked": is_blocked,
            "is_verified": is_verified,
            "authentication_by_admin": authentication_by_admin
        })

    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/logout", methods=["POST"])
def logout():
    token = request.headers.get("Authorization")
    print(f"Отриманий заголовок Authorization: {token}")
    if not token:
        return jsonify({"success": False, "message": "Токен відсутній."}), 401

    if token.startswith("Bearer "):
        token = token.split(" ")[1]

    print(f"Витягнутий токен для перевірки: {token}")

    token_info = get_token_info(token)
    print(f"Результат пошуку токена: {token_info}")

    if not token_info:
        return jsonify({"success": False, "message": "Токен не знайдено."}), 403

    user_id, created_at = token_info

    if not is_token_valid(token):
        print("Токен минув, видаляємо його.")
        delete_token(user_id)
        return jsonify({"success": False, "message": "Термін дії токена минув."}), 401

    delete_token(user_id)
    print(f"Токен {token} для користувача {user_id} видалено.")

    return jsonify({"success": True, "message": "Ви успішно вийшли із системи."})







def update_user_data(user_id, role, data):
    conn = get_db_connection()
    cursor = conn.cursor()

    table = {
        "admin": "admins",
        "client": "clients",
        "organization": "organizations"
    }.get(role)

    if not table:
        conn.close()
        raise ValueError("Некоректна роль")

    allowed_fields = {
            "admin": [
                "name", "surname", "gender", "birth_date", "phone_number",
                "country", "region", "city", "relationship_status", "attitude_to_smoking",
                "attitude_to_alcohol", "attitude_to_drugs", "education", "occupation",
                "password"
            ],
            "client": [
                "name", "surname", "gender", "birth_date", "phone_number",
                "country", "region", "city", "relationship_status", "attitude_to_smoking",
                "attitude_to_alcohol", "attitude_to_drugs", "education", "occupation",
                "password"
            ],
            "organization": [
                "organization_name", "organization_phone_number", "country", "region", "city",
                "organization_head_name", "organization_head_surname", "organization_head_gender",
                "organization_registration_date", "organization_type", "number_of_employees",
                "organization_registration_goal", "social_links_Instagram", "social_links_Facebook",
                "social_links_Discord", "social_links_Telegram", "organization_website",
                "organization_password"
            ]
    }

    updates = []
    params = []

    for key in allowed_fields[role]:
        if key in data:
            value = data[key]
            if key == "password" and value:
                value = hash_password(value)
            updates.append(f"{key} = ?")
            params.append(value)

    if not updates:
        conn.close()
        return

    params.append(user_id)
    sql = f"UPDATE {table} SET {', '.join(updates)} WHERE id = ?"
    cursor.execute(sql, params)
    conn.commit()
    conn.close()

@app.route('/api/update-profile', methods=['POST'])
def update_profile():
    try:
        user_id = request.json.get("user_id")
        role = request.json.get("role")
        data = request.json.get("data")

        if not user_id or not role or not data:
            return jsonify({"success": False, "message": "Недостатньо даних."}), 400

        update_user_data(user_id, role, data)
        return jsonify({"success": True, "message": "Дані оновлено."})

    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/get-profile', methods=['POST'])
def get_profile():
    try:
        user_id = request.json.get("user_id")
        role = request.json.get("role")

        if not user_id or not role:
            return jsonify({"success": False, "message": "Недостатньо даних."}), 400

        table = {
            "admin": "admins",
            "client": "clients",
            "organization": "organizations"
        }.get(role)

        if not table:
            return jsonify({"success": False, "message": "Некоректна роль."}), 400

        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(f"SELECT * FROM {table} WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({"success": False, "message": "Користувача не знайдено."}), 404

        profile_data = dict(row)
        return jsonify({"success": True, "user": profile_data})

    except Exception as e:
        log_event("error", request.json.get("user_id"), None, f"Помилка: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/toggle-notifications', methods=['POST'])
def toggle_notifications():
    try:
        user_id = request.json.get("user_id")
        role = request.json.get("role")
        status = request.json.get("status")

        if not user_id or not role or status not in [0, 1]:
            return jsonify({"success": False, "message": "Недостатньо даних."}), 400

        table = {
            "admin": "admins",
            "client": "clients",
            "organization": "organizations"
        }[role]

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"UPDATE {table} SET notification_status = ? WHERE id = ?", (status, user_id))
        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Статус повідомлень оновлено."})

    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/update-password', methods=['POST'])
def update_password():
    try:
        user_id = request.json.get("user_id")
        role = request.json.get("role")
        old_password = request.json.get("old_password")
        new_password = request.json.get("new_password")

        if not user_id or not role or not old_password or not new_password:
            return jsonify({"success": False, "message": "Недостатньо даних."}), 400

        table = {
            "admin": "admins",
            "client": "clients",
            "organization": "organizations"
        }[role]

        password_field = "password" if role in ["admin", "client"] else "organization_password"

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(f"SELECT {password_field} FROM {table} WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "message": "Користувача не знайдено."}), 404

        stored_hashed_password = row[0]
        if not verify_password(old_password, stored_hashed_password):
            return jsonify({"success": False, "message": "Невірно введено старий пароль."}), 403

        hashed_new = hash_password(new_password)
        cursor.execute(f"UPDATE {table} SET {password_field} = ? WHERE id = ?", (hashed_new, user_id))
        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Пароль успішно оновлено."})

    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/profile-complete', methods=['POST'])
def is_profile_complete():
    try:
        user_id = request.json.get("user_id")
        role = request.json.get("role")

        if not user_id or not role:
            return jsonify({"success": False, "message": "Недостатньо даних."}), 400

        table = {
            "admin": "admins",
            "client": "clients",
            "organization": "organizations"
        }.get(role)

        if not table:
            return jsonify({"success": False, "message": "Некоректна роль."}), 400

        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM {table} WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({"success": False, "message": "Користувача не знайдено."}), 404

        user_data = dict(row)

        required_fields = {
            "admin": [
                "name", "surname", "gender", "birth_date", "phone_number",
                "country", "region", "city", "relationship_status", "attitude_to_smoking",
                "attitude_to_alcohol", "attitude_to_drugs", "education", "occupation",
                "password"
            ],
            "client": [
                "name", "surname", "gender", "birth_date", "phone_number",
                "country", "region", "city", "relationship_status", "attitude_to_smoking",
                "attitude_to_alcohol", "attitude_to_drugs", "education", "occupation",
                "password"
            ],
            "organization": [
                "organization_name", "organization_phone_number", "country", "region", "city",
                "organization_head_name", "organization_head_surname", "organization_head_gender",
                "organization_registration_date", "organization_type", "number_of_employees",
                "organization_registration_goal", "social_links_Instagram", "social_links_Facebook",
                "social_links_Discord", "social_links_Telegram", "organization_website",
                "organization_password"
            ]
        }[role]

        incomplete = any(not user_data.get(field) for field in required_fields)

        return jsonify({
            "success": True,
            "profile_complete": not incomplete
        })

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500






@app.route("/api/user/points/<int:user_id>", methods=["GET"])
def get_user_points(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT points FROM global_users WHERE global_id = ?", (user_id,))
    result = cursor.fetchone()
    conn.close()
    if result:
        return jsonify({"success": True, "points": result[0]})
    return jsonify({"success": False, "message": "Користувача не знайдено."})

@app.route("/api/withdraw", methods=["POST"])
def create_withdraw_request():
    data = request.get_json()
    user_id = data.get("userId")
    amount = int(data.get("amount"))
    type = data.get("type")

    phone_number = data.get("phoneNumber", "") if type == "mobile" else None
    charity_link = data.get("charityLink", "") if type == "charity" else None

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT role FROM global_users WHERE global_id = ?", (user_id,))
    user_role = cursor.fetchone()
    if not user_role:
        conn.close()
        return jsonify({"success": False, "message": "Користувача не знайдено."})

    table_name = {
        "admin": "admins",
        "client": "clients",
        "organization": "organizations"
    }.get(user_role[0])

    if not table_name:
        conn.close()
        return jsonify({"success": False, "message": "Роль користувача не підтримується."})

    cursor.execute(f"SELECT points FROM {table_name} WHERE id = ?", (user_id,))
    user_data = cursor.fetchone()
    if not user_data or user_data[0] < amount:
        conn.close()
        return jsonify({"success": False, "message": "Не достатньо балів для виведення."})

    new_points = user_data[0] - amount
    cursor.execute(f"UPDATE {table_name} SET points = ? WHERE id = ?", (new_points, user_id))

    equivalent_uah = amount / 2

    now = datetime.now()
    cursor.execute("""
        INSERT INTO withdrawals (user_id, amount, equivalent_uah, type, phone_number, charity_link, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (user_id, amount, equivalent_uah, type, phone_number, charity_link, now.strftime("%Y-%m-%d %H:%M:%S")))

    conn.commit()
    conn.close()
    log_event(
    log_type="score_withdraw",
    user_id=user_id,
    description=f"Користувач {user_id} створив заявку на виведення {amount} балів, тип={type}"
    )
    return jsonify({"success": True, "message": "Заявку успішно надіслано"})

@app.route("/api/user/withdrawals/<int:user_id>", methods=["GET"])
def get_user_withdrawals(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT created_at, amount, equivalent_uah, type, phone_number, charity_link, status
        FROM withdrawals
        WHERE user_id = ?
        ORDER BY created_at DESC
    """, (user_id,))
    withdrawals = cursor.fetchall()
    conn.close()

    result = [
        {
            "date": withdrawal[0],
            "amount": withdrawal[1],
            "equivalent_uah": withdrawal[2],
            "type": withdrawal[3],
            "phone_number": withdrawal[4],
            "charity_link": withdrawal[5],
            "status": withdrawal[6],
        }
        for withdrawal in withdrawals
    ]
    return jsonify({"success": True, "withdrawals": result})

@app.route("/api/recharge_request", methods=["POST"])
def create_recharge_request():
    data = request.get_json()
    organization_id = data.get("organizationId")
    requested_points = int(data.get("requestedPoints"))
    description = data.get("description", "")

    if requested_points <= 0:
        return jsonify({"success": False, "message": "Кількість балів має бути більше 0"})

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT organization_name, points FROM organizations WHERE id = ?", (organization_id,))
    organization = cursor.fetchone()
    if not organization:
        conn.close()
        return jsonify({"success": False, "message": "Організацію не знайдено"})

    organization_name, current_points = organization
    equivalent_uah = requested_points / 2
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        INSERT INTO recharge_requests (organization_id, organization_name, current_points,
        requested_points, equivalent_uah, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (organization_id, organization_name, current_points, requested_points, equivalent_uah, description, created_at))

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Заявка успішно створена"})

@app.route("/api/recharge_requests", methods=["GET"])
def get_recharge_requests():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, organization_name, current_points, requested_points, equivalent_uah,
        description, created_at, status, admin_id, admin_comment
        FROM recharge_requests
        ORDER BY created_at DESC
    """)
    requests = cursor.fetchall()
    conn.close()

    result = [
        {
            "id": request[0],
            "organization_name": request[1],
            "current_points": request[2],
            "requested_points": request[3],
            "equivalent_uah": request[4],
            "description": request[5],
            "created_at": request[6],
            "status": request[7],
            "admin_id": request[8],
            "admin_comment": request[9],
        }
        for request in requests
    ]
    return jsonify({"success": True, "requests": result})

@app.route("/api/recharge_request/<int:request_id>", methods=["POST"])
def update_recharge_request(request_id):
    data = request.get_json()
    admin_id = data.get("adminId")
    status = data.get("status")
    admin_comment = data.get("adminComment", "")

    if status not in ["approved", "rejected"]:
        return jsonify({"success": False, "message": "Некоректний статус заявки"})

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT organization_id, requested_points FROM recharge_requests WHERE id = ?", (request_id,))
    recharge_request = cursor.fetchone()
    if not recharge_request:
        conn.close()
        return jsonify({"success": False, "message": "Заявку не знайдено"})

    organization_id, requested_points = recharge_request

    if status == "approved":
        cursor.execute("UPDATE organizations SET points = points + ? WHERE id = ?", (requested_points, organization_id))

    log_event(
        log_type="score_receive",
        user_id=organization_id,
        description=f"Організація {organization_id} отримала {requested_points} балів (approve recharge)"
    )

    cursor.execute("""
        UPDATE recharge_requests
        SET status = ?, admin_id = ?, admin_comment = ?
        WHERE id = ?
    """, (status, admin_id, admin_comment, request_id))

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": f"Заявка успішно {status}"})

@app.route("/api/recharge_requests/organization/<int:organization_id>", methods=["GET"])
def get_organization_recharge_requests(organization_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, organization_name, current_points, requested_points, equivalent_uah,
        description, created_at, status, admin_id, admin_comment
        FROM recharge_requests
        WHERE organization_id = ?
        ORDER BY created_at DESC
    """, (organization_id,))
    requests = cursor.fetchall()
    conn.close()

    result = [
        {
            "id": request[0],
            "organization_name": request[1],
            "current_points": request[2],
            "requested_points": request[3],
            "equivalent_uah": request[4],
            "description": request[5],
            "created_at": request[6],
            "status": request[7],
            "admin_id": request[8],
            "admin_comment": request[9],
        }
        for request in requests
    ]
    return jsonify({"success": True, "requests": result})

@app.route("/api/admin/withdrawals", methods=["GET"])
def get_all_withdrawals():
    user_role = request.headers.get("role")
    if user_role != "admin":
        return jsonify({"success": False, "message": "Доступ заборонено"}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT w.id, w.user_id, w.created_at, u.role AS user_role, u.points AS current_points,
               w.amount, w.equivalent_uah, w.type, w.phone_number, w.charity_link, w.status
        FROM withdrawals w
        JOIN global_users u ON w.user_id = u.global_id
        ORDER BY w.created_at DESC
    """)
    withdrawals = cursor.fetchall()
    conn.close()

    result = [
        {
            "id": withdrawal[0],
            "user_id": withdrawal[1],
            "created_at": withdrawal[2],
            "user_role": withdrawal[3],
            "current_points": withdrawal[4],
            "withdraw_amount": withdrawal[5],
            "equivalent_uah": withdrawal[6],
            "type": withdrawal[7],
            "phone_number": withdrawal[8],
            "charity_link": withdrawal[9],
            "status": withdrawal[10],
        }
        for withdrawal in withdrawals
    ]
    return jsonify({"success": True, "withdrawals": result})

@app.route("/api/admin/withdrawal/<int:withdrawal_id>", methods=["POST"])
def process_withdrawal_request(withdrawal_id):
    user_role = request.headers.get("role")
    if user_role != "admin":
        return jsonify({"success": False, "message": "Доступ заборонено"}), 403

    data = request.get_json()
    action = data.get("action")
    if action not in ["approve", "reject"]:
        return jsonify({"success": False, "message": "Неправильна дія"})

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT w.status, w.user_id, w.amount, w.type, w.phone_number, w.charity_link, u.role
        FROM withdrawals w
        JOIN global_users u ON w.user_id = u.global_id
        WHERE w.id = ?
    """, (withdrawal_id,))
    withdrawal = cursor.fetchone()

    if not withdrawal:
        conn.close()
        return jsonify({"success": False, "message": "Заявку не знайдено"})

    status, user_id, amount, withdrawal_type, phone_number, charity_link, user_role = withdrawal

    if status in ["approved", "rejected"]:
        conn.close()
        return jsonify({"success": False, "message": f"Заявку вже {status}."})

    table_name = {
        "admin": "admins",
        "client": "clients",
        "organization": "organizations"
    }.get(user_role)

    if not table_name:
        conn.close()
        return jsonify({"success": False, "message": "Роль користувача не підтримується."})

    if action == "approve":
        cursor.execute(f"UPDATE {table_name} SET points = points - ? WHERE id = ?", (amount, user_id))

        cursor.execute("""
            UPDATE withdrawals
            SET status = 'approved'
            WHERE id = ?
        """, (withdrawal_id,))
        message = "Ваші бали успішно нараховано."
    else:
        cursor.execute(f"UPDATE {table_name} SET points = points + ? WHERE id = ?", (amount, user_id))
        cursor.execute("""
            UPDATE withdrawals
            SET status = 'rejected'
            WHERE id = ?
        """, (withdrawal_id,))
        message = "На жаль, ваша заявка на виведення балів була відхилена. Бали повернуті на ваш рахунок."

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": f"Заявка {action} успішно оброблена"})






def connect_db():
    return get_db_connection()


@app.route("/api/tariffs", methods=["GET"])
def get_tariffs():
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tariffs")
    tariffs = cursor.fetchall()
    conn.close()
    return jsonify([
        {
            "id": t[0],
            "vipNumber": t[1],
            "price": t[2],
            "duration": t[3],
            "startDate": t[4],
            "endDate": t[5],
            "title": t[6],
            "description": t[7],
            "questionTypes": t[8].split(","),
            "status": t[9]
        } for t in tariffs
    ])

@app.route("/api/tariffs", methods=["POST"])
def add_tariff():
    data = request.get_json()
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO tariffs (vipNumber, price, duration, startDate, endDate, title, description, questionTypes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data["vipNumber"], data["price"], data["duration"],
        data["startDate"], data["endDate"], data["title"],
        data["description"], ",".join(map(str, data["questionTypes"])), "Черновик"
    ))
    conn.commit()
    conn.close()
    log_event("tariff_create", user_id=g.user_id, project_id=None, description=f"Створено тариф з vipNumber={data['vipNumber']}")

    return jsonify({"success": True, "message": "Тариф доданий успішно"}), 201

@app.route("/api/tariffs/<int:tariff_id>", methods=["DELETE"])
def delete_tariff(tariff_id):
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM tariffs WHERE id = ?", (tariff_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"success": False, "message": "Тариф не знайдено"}), 404

    cursor.execute("DELETE FROM tariffs WHERE id = ?", (tariff_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Тариф успішно видалено"}), 200

@app.route("/api/tariffs/<int:tariff_id>", methods=["PUT"])
def edit_tariff(tariff_id):
    data = request.get_json()
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM tariffs WHERE id = ?", (tariff_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"success": False, "message": "Тариф не знайдено"}), 404

    cursor.execute("""
        UPDATE tariffs
        SET vipNumber = ?, price = ?, duration = ?, startDate = ?, endDate = ?,
            title = ?, description = ?, questionTypes = ?, status = ?
        WHERE id = ?
    """, (
        data["vipNumber"], data["price"], data["duration"], data["startDate"],
        data["endDate"], data["title"], data["description"],
        ",".join(map(str, data["questionTypes"])), data["status"], tariff_id
    ))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Тариф успешно оновлено"}), 200

@app.route("/api/users/<int:user_id>", methods=["GET"])
def get_user_details(user_id):
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("SELECT points, vip FROM global_users WHERE global_id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()

    if user:
        return jsonify({"points": user[0], "vip": user[1]})
    else:
        return jsonify({"success": False, "message": "Користувача не знайдено."}), 404

@app.route("/api/tariffs/<int:tariff_id>/purchase", methods=["POST"])
def purchase_tariff(tariff_id):
    user_id = request.json.get("userId")
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("SELECT price, vipNumber, duration FROM tariffs WHERE id = ? AND status = 'Активна'", (tariff_id,))
    tariff = cursor.fetchone()
    if not tariff:
        conn.close()
        return jsonify({"success": False, "message": "Тариф не знайдено або недоступне."}), 404

    price, vip_number, duration = tariff

    cursor.execute("SELECT role FROM global_users WHERE global_id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return jsonify({"success": False, "message": "Користувача не знайдено."}), 404

    role = user[0]

    table_name = {
        "admin": "admins",
        "client": "clients",
        "organization": "organizations"
    }.get(role)

    if not table_name:
        conn.close()
        return jsonify({"success": False, "message": "Роль користувача не визначена."}), 400

    cursor.execute(f"SELECT points FROM {table_name} WHERE id = ?", (user_id,))
    user_points = cursor.fetchone()
    if not user_points or user_points[0] < price:
        conn.close()
        return jsonify({"success": False, "message": "Не достатньо балів для покупки тарифу."}), 400

    cursor.execute(
        f"UPDATE {table_name} SET points = points - ?, vip = ? WHERE id = ?",
        (price, vip_number, user_id),
    )

    purchase_date = datetime.now()
    end_date = purchase_date + timedelta(days=duration)

    cursor.execute("""
        INSERT INTO user_tariffs (user_id, tariff_id, purchase_date, end_date, price)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, tariff_id, purchase_date.strftime("%Y-%m-%d %H:%M:%S"), end_date.strftime("%Y-%m-%d %H:%M:%S"), price))

    conn.commit()
    conn.close()
    log_event(
    log_type="tariff_purchase",
    user_id=user_id,
    project_id=None,
    description=f"Придбання тарифу {tariff_id} користувачем {user_id}, ціна = {price}"
    )
    return jsonify({"success": True, "message": "Тариф успішно придбано."})

@app.route("/api/tariffs/<int:tariff_id>/cancel", methods=["POST"])
def cancel_tariff(tariff_id):
    print(f"Запит на скасування тарифу {tariff_id} від користувача {request.json.get('userId')}")
    user_id = request.json.get("userId")
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("SELECT role FROM global_users WHERE global_id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return jsonify({"success": False, "message": "Користувача не знайдено."}), 404

    role = user[0]

    table_name = {
        "admin": "admins",
        "client": "clients",
        "organization": "organizations"
    }.get(role)

    if not table_name:
        conn.close()
        return jsonify({"success": False, "message": "Роль користувача не визначена."}), 400

    cursor.execute("SELECT id FROM user_tariffs WHERE user_id = ? AND tariff_id = ?", (user_id, tariff_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"success": False, "message": "Тариф не знайдено."}), 404

    cursor.execute("DELETE FROM user_tariffs WHERE user_id = ? AND tariff_id = ?", (user_id, tariff_id))

    new_vip_status = 0 if role == "client" else 1 if role == "organization" else None
    if new_vip_status is not None:
        cursor.execute(f"UPDATE {table_name} SET vip = ? WHERE id = ?", (new_vip_status, user_id))
    else:
        print("Для ролі адміністратора зміна VIP не потрібна.")

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Тариф успішно скасовано."})






@app.route('/api/organizations', methods=['GET'])
def get_organizations():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, organization_head_name, organization_registration_date, organization_email,
                   organization_name, is_verified, social_links_Instagram, social_links_Facebook,
                   social_links_Discord, social_links_Telegram, organization_website,
                   organization_registration_goal, documents_path
            FROM organizations
            WHERE authentication_by_admin = 0
        """)
        organizations = cursor.fetchall()

        print("Вилучені дані:", organizations)

        if not organizations:
            print("Нема організацій для верифікації.")
            return jsonify({"success": True, "organizations": []})

        return jsonify({
            "success": True,
            "organizations": [
                {
                    "id": org[0],
                    "head_name": org[1],
                    "registration_date": org[2],
                    "email": org[3],
                    "name": org[4],
                    "is_verified": org[5],
                    "social_links": {
                        "instagram": org[6],
                        "facebook": org[7],
                        "discord": org[8],
                        "telegram": org[9],
                    },
                    "website": org[10],
                    "registration_goal": org[11],
                    "documents_path": org[12],
                } for org in organizations
            ]
        })
    except sqlite3.Error as e:
        print("Помилка бази даних:", e)
        return jsonify({"success": False, "message": "Помилка бази даних"}), 500
    finally:
        conn.close()

@app.route('/api/organizations/approve', methods=['POST'])
def approve_organization():
    data = request.get_json()
    org_id = data.get('id')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE organizations
            SET is_verified = 1, authentication_by_admin = 1
            WHERE id = ?
        """, (org_id,))
        conn.commit()
        log_event("verify_org", org_id, None, f"Організація {org_id} верифікована адміном {g.user_id}")


        cursor.execute("SELECT organization_email FROM organizations WHERE id = ?", (org_id,))
        email = cursor.fetchone()
        if email:
            send_verification_email(email[0], "Ваші документи були успішно верифіковані!")

        return jsonify({"success": True, "message": "Організація успішно верифікована."})
    except sqlite3.Error as e:
        print("Помилка бази даних:", e)
        return jsonify({"success": False, "message": "Помилка бази даних"}), 500
    finally:
        conn.close()

def send_rejection_email(to_email, reason):
    sender_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_server = "smtp.gmail.com"
    smtp_port = 587

    subject = "Повідомлення про відхилення верифікації"
    message_body = f"""
    Вітаємо,

    Ваш запит на верифікацію було відхилено з наступної причини:
    {reason}

    Для повторного розгляду, будь ласка, дайте відповідь на це повідомлення, доклавши необхідні документи.

    З повагою,
    Команда OwlView
    """

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(message_body, 'plain'))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, smtp_password)
            server.sendmail(sender_email, to_email, msg.as_string())
            print(f"Лист успішно надіслано на {to_email}")
    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        print(f"Помилка при надсиланні листа: {e}")
        raise

@app.route('/api/organizations/reject', methods=['POST'])
def reject_organization():
    data = request.get_json()
    org_id = data.get('id')
    reason = data.get('reason')

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE organizations
            SET authentication_by_admin = 0
            WHERE id = ?
        """, (org_id,))
        conn.commit()
        log_event("verify_org", org_id, None, f"Відхилено верифікацію організації {org_id} адміном {g.user_id}, причина: {reason}")


        cursor.execute("SELECT organization_email FROM organizations WHERE id = ?", (org_id,))
        email = cursor.fetchone()

        if email:
            send_rejection_email(email[0], reason)
        else:
            print(f"Email організації з ID {org_id} не знайдено.")

        return jsonify({"success": True, "message": "Організацію успішно відхилено та повідомлення надіслано."})
    except sqlite3.Error as e:
        print("Помилка бази даних:", e)
        return jsonify({"success": False, "message": "Помилка бази даних"}), 500
    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        print("Общая Помилка:", e)
        return jsonify({"success": False, "message": "Помилка при обробці запиту"}), 500
    finally:
        conn.close()






@app.route('/api/support/messages', methods=['GET'])
def get_messages():
    folder = request.args.get('folder', 'inbox')
    user_id = g.user_id

    conn = get_db_connection()
    cursor = conn.cursor()

    folder_query = {
        'inbox': "WHERE recipient_id = ? AND deleted = 0 AND read = 0",
        'outbox': "WHERE sender_id = ? AND deleted = 0",
        'postponed': "WHERE recipient_id = ? AND status = 'postponed'",
        'deleted': "WHERE recipient_id = ? AND deleted = 1",
        'read': "WHERE recipient_id = ? AND read = 1 AND deleted = 0"
    }
    query = f"""
        SELECT
            m.id,
            m.date,
            m.sender_email,
            gu_recipient.email AS recipient_email,
            m.subject,
            m.text
        FROM messages m
        LEFT JOIN global_users gu_recipient ON m.recipient_id = gu_recipient.global_id
        {folder_query.get(folder, folder_query['inbox'])}
    """
    cursor.execute(query, (user_id,))
    messages = cursor.fetchall()

    conn.close()

    return jsonify({
        "success": True,
        "messages": [
            {
                "id": m[0],
                "date": m[1],
                "senderEmail": m[2],
                "recipientEmail": m[3],
                "subject": m[4],
                "text": m[5]
            }
            for m in messages
        ]
    })

@app.route('/api/support/reply', methods=['POST'])
def reply_message():
    data = request.json
    sender_id = g.user_id
    recipient = data.get('recipient_id')
    subject = "RE: " + data.get('subject')
    text = data.get('text')
    original_message_id = data.get('original_message_id')

    if not recipient or not subject or not text or not original_message_id:
        return jsonify({"success": False, "message":"Всі поля є обов'язковими для заповнення."}), 400

    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT email FROM global_users WHERE global_id = ?", (sender_id,))
        sender_email = cursor.fetchone()
        if not sender_email:
            conn.close()
            return jsonify({"success": False, "message": "Відправника не знайдено."}), 404
        sender_email = sender_email[0]

        recipient_id = None
        if recipient.isdigit():
            recipient_id = int(recipient)
        else:
            cursor.execute("SELECT global_id FROM global_users WHERE email = ?", (recipient,))
            result = cursor.fetchone()
            if result:
                recipient_id = result[0]

        if not recipient_id:
            conn.close()
            return jsonify({"success": False, "message": "Одержувача не знайдено."}), 404

        cursor.execute("""
            INSERT INTO messages (sender_id, sender_email, recipient_id, subject, text, date)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        """, (sender_id, sender_email, recipient_id, subject, text))

        cursor.execute("""
            UPDATE messages
            SET read = 1, status = NULL
            WHERE id = ?
        """, (original_message_id,))

        conn.commit()
        conn.close()

    return jsonify({"success": True, "message": "Відповідь надіслано."})

@app.route('/api/support/send', methods=['POST'])
def send_message():
    if not g.user_role:
        return jsonify({"success": False, "message": "Необхідна авторизація."}), 401

    data = request.json
    sender_id = g.user_id
    recipient_input = data.get('recipientId')
    subject = data.get('subject')
    text = data.get('text')

    if not all([recipient_input, subject, text]):
        return jsonify({"success": False, "message":"Всі поля є обов'язковими для заповнення."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT email FROM global_users WHERE global_id = ?", (sender_id,))
    sender_email = cursor.fetchone()
    if not sender_email:
        conn.close()
        return jsonify({"success": False, "message": "Відправника не знайдено."}), 404
    sender_email = sender_email[0]

    recipients = []
    if recipient_input.lower() == "all" and g.user_role == "admin":
        cursor.execute("SELECT global_id FROM global_users WHERE global_id != ?", (sender_id,))
        recipients = [row[0] for row in cursor.fetchall()]
    elif recipient_input.isdigit():
        recipients = [int(recipient_input)]
    else:
        cursor.execute("SELECT global_id FROM global_users WHERE email = ?", (recipient_input,))
        recipient = cursor.fetchone()
        if not recipient:
            conn.close()
            return jsonify({"success": False, "message": "Одержувача не знайдено."}), 404
        recipients = [recipient[0]]

    recipients = [r for r in recipients if r != sender_id]

    if not recipients:
        conn.close()
        return jsonify({"success": False, "message": "Повідомлення не можна надіслати самому собі."}), 400

    for recipient in recipients:
        cursor.execute("""
            INSERT INTO messages (sender_id, sender_email, recipient_id, subject, text, date)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        """, (sender_id, sender_email, recipient, subject, text))

    conn.commit()
    conn.close()
    log_event(
    log_type="message_send",
    user_id=sender_id,
    description=f"Відправлено повідомлення на підтримку. Тема='{subject}', кому={recipient_input}"
    )


    return jsonify({"success": True, "message": "Повідомлення успішно надіслано."})

@app.route('/api/support/delete', methods=['POST'])
def delete_message():
    with db_lock:
        data = request.json
        message_id = data.get('id')
        user_id = g.user_id

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE messages
            SET deleted = 1
            WHERE id = ? AND (sender_id = ? OR recipient_id = ?)
        """, (message_id, user_id, user_id))

        conn.commit()
        conn.close()

    return jsonify({"success": True, "message": "Повідомлення видалено."})

@app.route('/api/support/postpone', methods=['POST'])
def postpone_message():
    data = request.json
    message_id = data.get('id')
    user_id = g.user_id

    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("""
                UPDATE messages
                SET status = 'postponed', read = 1
                WHERE id = ? AND recipient_id = ?
            """, (message_id, user_id))

            conn.commit()
        except sqlite3.Error as e:
            conn.rollback()
            return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500
        finally:
            conn.close()

    return jsonify({"success": True, "message": "Повідомлення відкладено."})

@app.route('/api/support/update_status', methods=['POST'])
def update_message_status():
    data = request.json
    message_id = data.get('id')
    new_status = data.get('status')
    user_id = g.user_id

    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()

        if new_status == 'read':
            cursor.execute("""
                UPDATE messages
                SET read = 1
                WHERE id = ? AND recipient_id = ?
            """, (message_id, user_id))
        else:
            cursor.execute("""
                UPDATE messages
                SET status = ?
                WHERE id = ? AND recipient_id = ?
            """, (new_status, message_id, user_id))

        conn.commit()
        conn.close()

    return jsonify({"success": True, "message": f"Повідомлення позначено як {new_status}."})

@app.route('/api/support/unread-messages', methods=['GET'])
def get_unread_messages_count():
    user_id = g.user_id
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT COUNT(*)
            FROM messages
            WHERE recipient_id = ? AND deleted = 0 AND read = 0
        """, (user_id,))
        unread_count = cursor.fetchone()[0]
    except sqlite3.Error as e:
        return jsonify({"success": False, "message": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()
    return jsonify({"success": True, "unreadCount": unread_count})






@app.route("/api/users", methods=["GET"])
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM global_users;")
    users = cursor.fetchall()
    conn.close()

    result = []
    for user in users:
        result.append({
            "id": user[0],
            "registration_date": user[9],
            "email": user[1],
            "role": user[-1],
            "gender": user[5],
            "organization_head_gender": user[31],
            "rating": user[8],
            "points": user[16],
            "vip": user[27],
            "is_verified": user[11],
            "is_blocked": user[13],
            "status": "заблокирован" if user[13] else "разблокирован",
        })
    return jsonify({"success": True, "users": result})

@app.route("/api/users/block", methods=["POST"])
def block_user():
    data = request.json
    user_id = data.get("userId")
    who_blocked_id = data.get("whoBlockedId")
    block_end_date = data.get("endDate")
    block_end_time = data.get("endTime")
    reason = data.get("reason") or ""

    now_date = datetime.now().strftime("%Y-%m-%d")
    now_time = datetime.now().strftime("%H:%M")

    conn = sqlite3.connect("main.db")
    cursor = conn.cursor()

    tables = ["admins", "clients", "organizations", "global_users"]
    found_table = None
    for t in tables:
        cursor.execute(f"SELECT id FROM {t} WHERE id=?", (user_id,))
        row = cursor.fetchone()
        if row:
            found_table = t
            break

    if not found_table:
        conn.close()
        return jsonify({"success": False, "message": "Користувача не знайдено."})

    cursor.execute(f"UPDATE {found_table} SET is_blocked=2 WHERE id=?", (user_id,))

    cursor.execute("""
        INSERT INTO user_blocks (
            who_blocked,
            who_is_blocked,
            block_date,
            block_time,
            end_date,
            end_time,
            reason
        )
        VALUES (?,?,?,?,?,?,?)
    """, (
        who_blocked_id,
        user_id,
        now_date,
        now_time,
        block_end_date,
        block_end_time,
        reason
    ))

    conn.commit()
    conn.close()
    log_event(
    log_type="user_block",
    user_id=user_id,
    project_id=None,
    description=f"Користувача {user_id} заблоковано користувачем {who_blocked_id}, причина={reason}"
    )
    return jsonify({"success": True, "message": f"User {user_id} заблокирован"})

@app.route("/api/users/unblock", methods=["POST"])
def unblock_user():
    data = request.json
    user_id = data.get("userId")

    conn = sqlite3.connect("main.db")
    cursor = conn.cursor()

    tables = ["admins", "clients", "organizations", "global_users"]
    found_table = None
    for t in tables:
        cursor.execute(f"SELECT id FROM {t} WHERE id=?", (user_id,))
        row = cursor.fetchone()
        if row:
            found_table = t
            break

    if not found_table:
        conn.close()
        return jsonify({"success": False, "message": "Користувача не знайдено."})

    cursor.execute(f"UPDATE {found_table} SET is_blocked=0 WHERE id=?", (user_id,))

    cursor.execute("DELETE FROM user_blocks WHERE who_is_blocked=?", (user_id,))

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": f"Користувача з айді {user_id} розблоковано"})

@app.route("/api/users/delete", methods=["POST"])
def delete_user():
    data = request.json
    user_id = data.get("userId")

    conn = sqlite3.connect("main.db")
    cursor = conn.cursor()

    tables = ["admins", "clients", "organizations", "global_users"]
    found_table = None
    for t in tables:
        cursor.execute(f"SELECT id FROM {t} WHERE id=?", (user_id,))
        row = cursor.fetchone()
        if row:
            found_table = t
            break

    if not found_table:
        conn.close()
        return jsonify({"success": False, "message": "Користувача не знайдено."})

    cursor.execute(f"UPDATE {found_table} SET is_deleted=1 WHERE id=?", (user_id,))
    conn.commit()
    conn.close()
    log_event(
    log_type="user_delete",
    user_id=user_id,
    project_id=None,
    description=f"Користувача {user_id} позначені is_deleted=1 адміністратором {g.user_id}"
    )
    return jsonify({"success": True, "message": f"Користувача з айді {user_id} видалено"})

@app.route("/api/users/make_admin", methods=["POST"])
def make_admin():
    data = request.json
    user_id = data["userId"]
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT * FROM clients WHERE id = ?", (user_id,))
        client = cursor.fetchone()

        if client:
            cursor.execute("DELETE FROM clients WHERE id = ?", (user_id,))
            cursor.execute("""
                INSERT INTO admins (
                    id, email, password, name, surname, gender, birth_date, phone_number,
                    rating, registration_date, notification_status, is_verified, is_admin,
                    is_blocked, is_deleted, authentication_by_admin, points, country, region, city,
                    relationship_status, attitude_to_smoking, attitude_to_alcohol,
                    attitude_to_drugs, education, occupation, login_attempts, vip
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, client)
        else:
            return jsonify({"success": False, "message": "Користувача не знайдено у таблиці clients"})

        old_path = os.path.join(BASE_CLIENT_SURVEY, str(user_id))
        new_path = os.path.join(BASE_ADMIN_SURVEY, str(user_id))
        if os.path.exists(old_path):
            shutil.move(old_path, new_path)
        else:
            os.makedirs(new_path, exist_ok=True)

        conn.commit()
        log_event(
        log_type="user_admin_assign",
        user_id=user_id,
        project_id=None,
        description=f"Призначений адміністратором user_id={user_id}, ініціатор={g.user_id}"
        )

        return jsonify({"success": True, "message": f"Користувача з айді {user_id} призначено адміністратором"})

    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        conn.rollback()
        return jsonify({"success": False, "message": str(e)})

    finally:
        conn.close()

@app.route("/api/users/remove_admin", methods=["POST"])
def remove_admin():
    data = request.json
    user_id = data["userId"]
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT * FROM admins WHERE id = ?", (user_id,))
        admin = cursor.fetchone()

        if admin:
            cursor.execute("DELETE FROM admins WHERE id = ?", (user_id,))
            cursor.execute("""
                INSERT INTO clients (
                    id, email, password, name, surname, gender, birth_date, phone_number,
                    rating, registration_date, notification_status, is_verified, is_admin,
                    is_blocked, is_deleted, authentication_by_admin, points, country, region, city,
                    relationship_status, attitude_to_smoking, attitude_to_alcohol,
                    attitude_to_drugs, education, occupation, login_attempts, vip
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, admin)
        else:
            return jsonify({"success": False, "message": "Користувача не знайдено в таблиці admins"})

        old_path = os.path.join(BASE_ADMIN_SURVEY, str(user_id))
        new_path = os.path.join(BASE_CLIENT_SURVEY, str(user_id))
        if os.path.exists(old_path):
            shutil.move(old_path, new_path)
        else:
            os.makedirs(new_path, exist_ok=True)

        conn.commit()
        log_event(
        log_type="user_admin_assign",
        user_id=user_id,
        project_id=None,
        description=f"Зняття повноважень адміністратора user_id={user_id}, ініціатор={g.user_id}"
        )
        return jsonify({"success": True, "message": f"Адміністратор з айді {user_id} знят з посади"})

    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        conn.rollback()
        return jsonify({"success": False, "message": str(e)})

    finally:
        conn.close()

@app.route("/api/users/filter", methods=["POST"])
def filter_users():
    data = request.json
    filters = data.get("filters", {})
    query = "SELECT id FROM global_users WHERE is_deleted=0 AND is_blocked=0"
    params = []

    if filters.get("registrationDate"):
        query += " AND registration_date >= ?"
        params.append(filters["registrationDate"])
    if filters.get("age"):
        query += " AND (strftime('%Y', 'now') - strftime('%Y', birth_date)) >= ?"
        params.append(filters["age"])
    if filters.get("rating"):
        query += " AND rating >= ?"
        params.append(filters["rating"])
    if filters.get("gender"):
        query += " AND gender = ?"
        params.append(filters["gender"])
    if filters.get("relationshipStatus"):
        query += " AND relationship_status = ?"
        params.append(filters["relationshipStatus"])
    if filters.get("country"):
        query += " AND country = ?"
        params.append(filters["country"])
    if filters.get("region"):
        query += " AND region = ?"
        params.append(filters["region"])
    if filters.get("city"):
        query += " AND city = ?"
        params.append(filters["city"])

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()

    filtered_ids = [row[0] for row in rows]
    return jsonify({"success": True, "filteredUsers": filtered_ids})






@app.route("/api/surveys/create", methods=["POST"])
def create_survey():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400

        owner_id = g.user_id
        owner_role = g.user_role

        survey_name = data.get("survey_name", "Без названия")
        reward = float(data.get("reward", 0))
        time_needed = int(data.get("time_needed", 0))
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        password_protected = data.get("password_protected", "нет")
        password = data.get("password") if password_protected == "да" else ""
        invited_respondents = data.get("invited_respondents", "")

        description = data.get("description", "")
        logo_link = data.get("logo_link", "")

        questions_shuffle = data.get("questions_shuffle", "нет")
        answers_shuffle = data.get("answers_shuffle", "нет")
        display_mode = data.get("display_mode", "single")

        anketa_json = data.get("anketa", {})
        creation_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        new_survey_id = str(uuid.uuid4())

        base_path = get_base_survey_path_by_role(owner_role)
        user_folder = os.path.join(base_path, str(owner_id))
        os.makedirs(user_folder, exist_ok=True)

        survey_folder = os.path.join(user_folder, f"survey_{new_survey_id}")
        os.makedirs(survey_folder, exist_ok=True)

        answers_folder = os.path.join(survey_folder, "answers")
        os.makedirs(answers_folder, exist_ok=True)

        anketa_folder = os.path.join(survey_folder, "anketa")
        os.makedirs(anketa_folder, exist_ok=True)

        anketa_file_path = os.path.join(anketa_folder, "anketa.json.enc")

        anketa_str = json.dumps(anketa_json, ensure_ascii=False, indent=2)
        encrypted_anketa = encrypt_data(anketa_str)

        with open(anketa_file_path, "w", encoding="utf-8") as f:
            f.write(encrypted_anketa)

        preview_link = f"/survey-preview/{new_survey_id}"

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO surveys (
                owner_id, survey_id, survey_name, status, reward, time_needed,
                start_date, end_date,
                password_protected, password,
                invited_respondents,
                survey_folder_link, answers_folder_link, anketa_folder_link,
                preview_link, creation_date,
                description, logo_link,
                questions_shuffle, answers_shuffle, display_mode
            )
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            owner_id, new_survey_id, survey_name, "черновик", reward, time_needed,
            start_date, end_date,
            password_protected, password,
            invited_respondents,
            survey_folder, answers_folder, anketa_folder,
            preview_link, creation_date,
            description, logo_link,
            questions_shuffle, answers_shuffle, display_mode
        ))
        conn.commit()
        conn.close()
   
        blockchain_data = {
            "survey_id": new_survey_id,
            "owner_id": owner_id,
            "survey_name": survey_name,
            "creation_date": creation_date,
            "hash_type": "creation"
        }
        
        block_hash = add_block(new_survey_id, blockchain_data)
        
        log_event(
            log_type="blockchain_creation",
            user_id=owner_id,
            project_id=None,
            description=f"Додано опитування {new_survey_id} до блокчейну, блок {block_hash[:10]}..."
        )
        
        return jsonify({
            "success": True,
            "message": "Опитування створено і додано до блокчейну!",
            "survey_id": new_survey_id,
            "block_hash": block_hash
        })

    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/surveys/<survey_id>", methods=["GET"])
def get_survey(survey_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM surveys WHERE survey_id = ?", (survey_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({"success": False, "message": "Опитування не знайдено"}), 404

        (
            db_id,
            owner_id,
            db_survey_id,
            survey_name,
            status,
            reward,
            time_needed,
            start_date,
            end_date,
            password_protected,
            password,
            invited_respondents,
            survey_folder,
            answers_folder,
            anketa_folder,
            preview_link,
            creation_date,
            description,
            logo_link,
            questions_shuffle,
            answers_shuffle,
            display_mode
        ) = row

        anketa_file_path = os.path.join(anketa_folder, "anketa.json.enc")

        if os.path.exists(anketa_file_path):
            with open(anketa_file_path, "r", encoding="utf-8") as f:
                encrypted_content = f.read()
            decrypted_str = decrypt_data(encrypted_content)
            anketa_data = json.loads(decrypted_str)
        else:
            anketa_data = {}

        return jsonify({
            "success": True,
            "survey": {
                "owner_id": owner_id,
                "survey_id": db_survey_id,
                "survey_name": survey_name,
                "status": status,
                "reward": reward,
                "time_needed": time_needed,
                "start_date": start_date,
                "end_date": end_date,
                "password_protected": password_protected,
                "password": password,
                "invited_respondents": invited_respondents,
                "survey_folder_link": survey_folder,
                "answers_folder_link": answers_folder,
                "anketa_folder_link": anketa_folder,
                "preview_link": preview_link,
                "creation_date": creation_date,
                "description": description,
                "logo_link": logo_link,
                "questions_shuffle": questions_shuffle,
                "answers_shuffle": answers_shuffle,
                "display_mode": display_mode,
                "anketa": anketa_data
            }
        })

    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/surveys/<survey_id>", methods=["PUT"])
def update_survey(survey_id):
    try:
        data = request.get_json()
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM surveys WHERE survey_id = ?", (survey_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"success": False, "message": "Опитування не знайдено"}), 404

        (
            db_id,
            owner_id,
            db_survey_id,
            old_survey_name,
            old_status,
            old_reward,
            old_time_needed,
            old_start_date,
            old_end_date,
            old_password_protected,
            old_password,
            old_invited_respondents,
            survey_folder,
            answers_folder,
            anketa_folder,
            preview_link,
            creation_date,
            old_description,
            old_logo_link,
            old_questions_shuffle,
            old_answers_shuffle,
            old_display_mode
        ) = row

        if owner_id != g.user_id:
            conn.close()
            return jsonify({"success": False, "message": "Немає прав на редагування"}), 403

        survey_name = data.get("survey_name", old_survey_name)
        reward = float(data.get("reward", old_reward))
        time_needed = int(data.get("time_needed", old_time_needed))
        start_date = data.get("start_date", old_start_date)
        end_date = data.get("end_date", old_end_date)
        password_protected = data.get("password_protected", old_password_protected)
        password = data.get("password", old_password) if password_protected == "да" else ""
        invited_respondents = data.get("invited_respondents", old_invited_respondents)
        description = data.get("description", old_description)
        logo_link = data.get("logo_link", old_logo_link)
        questions_shuffle = data.get("questions_shuffle", old_questions_shuffle)
        answers_shuffle = data.get("answers_shuffle", old_answers_shuffle)
        display_mode = data.get("display_mode", old_display_mode)

        anketa_json = data.get("anketa")
        if anketa_json is not None:
            anketa_file_path = os.path.join(anketa_folder, "anketa.json.enc")
            anketa_str = json.dumps(anketa_json, ensure_ascii=False, indent=2)
            encrypted_anketa = encrypt_data(anketa_str)

            with open(anketa_file_path, "w", encoding="utf-8") as f:
                f.write(encrypted_anketa)

        cursor.execute("""
            UPDATE surveys
            SET
                survey_name=?,
                reward=?,
                time_needed=?,
                start_date=?,
                end_date=?,
                password_protected=?,
                password=?,
                invited_respondents=?,
                description=?,
                logo_link=?,
                questions_shuffle=?,
                answers_shuffle=?,
                display_mode=?
            WHERE survey_id=?
        """, (
            survey_name,
            reward,
            time_needed,
            start_date,
            end_date,
            password_protected,
            password,
            invited_respondents,
            description,
            logo_link,
            questions_shuffle,
            answers_shuffle,
            display_mode,
            survey_id
        ))
        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Опитування оновлено"})

    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/surveys/<survey_id>/status", methods=["POST"])
def change_survey_status(survey_id):
    try:
        data = request.get_json()
        new_status = data.get("status")

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT owner_id, status FROM surveys WHERE survey_id = ?", (survey_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"success": False, "message": "Опитування не знайдено"}), 404

        owner_id, old_status = row

        valid_statuses = [
          "черновик", "активный", "на паузе", "завершён",
          "отложен", "пройден", "завершён создателем"
        ]
        if new_status not in valid_statuses:
            conn.close()
            return jsonify({"success": False, "message": "Неприпустимий статус"}), 400

        cursor.execute("""
            UPDATE surveys
            SET status=?
            WHERE survey_id=?
        """, (new_status, survey_id))
        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": f"Статус змінено на {new_status}"})
    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/surveys/<survey_id>/claim-reward", methods=["POST"])
def claim_reward(survey_id):
    try:
        user_id = g.user_id

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT reward, status FROM surveys WHERE survey_id=?", (survey_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"success": False, "message": "Опитування не знайдено"}), 404

        reward, status = row
        if status != "пройден":
            conn.close()
            return jsonify({"success": False, "message": "Не можна отримати нагороду: опитування не в статусі пройдено."}), 400

        cursor.execute("SELECT points FROM clients WHERE id=?", (user_id,))
        c = cursor.fetchone()
        if not c:
            cursor.execute("SELECT points FROM admins WHERE id=?", (user_id,))
            c = cursor.fetchone()
            if not c:
                cursor.execute("SELECT points FROM organizations WHERE id=?", (user_id,))
                c = cursor.fetchone()
                if not c:
                    conn.close()
                    return jsonify({"success": False, "message": "Користувача не знайдено."}), 404

        old_points = c[0]
        new_points = old_points + reward
        cursor.execute("UPDATE clients SET points=? WHERE id=?", (new_points, user_id))
        conn.commit()

        conn.close()
        return jsonify({"success": True, "message": f"Вам зараховано {reward} балів!"})
    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/surveys/<survey_id>/invite", methods=["POST"])
def send_invites(survey_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT status, invited_respondents, owner_id, reward
            FROM surveys
            WHERE survey_id = ?
        """, (survey_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"success": False, "message": "Опитування не знайдено"}), 404

        status, invited_list, owner_id, reward = row

        if owner_id != g.user_id:
            conn.close()
            return jsonify({"success": False, "message": "Недостатньо прав"}), 403

        if status != "активный":
            conn.close()
            return jsonify({"success": False, "message": "Опитування не в статусі 'активне'!"}), 400

        invite_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        invited_list = invited_list.strip()
        all_users = set()

        for part in invited_list.split(","):
            part = part.strip()
            if not part:
                continue

            if part == "@all":
                cursor.execute("""
                    SELECT id FROM clients
                    WHERE is_deleted=0 AND is_blocked=0 AND id != ?
                """, (owner_id,))
                results = cursor.fetchall()
                all_users.update(uid for (uid,) in results)

                cursor.execute("""
                    SELECT id FROM organizations
                    WHERE is_deleted=0 AND is_blocked=0 AND id != ?
                """, (owner_id,))
                results = cursor.fetchall()
                all_users.update(uid for (uid,) in results)

                cursor.execute("""
                    SELECT id FROM admins
                    WHERE is_deleted=0 AND is_blocked=0 AND id != ?
                """, (owner_id,))
                results = cursor.fetchall()
                all_users.update(uid for (uid,) in results)

            elif part == "@client":
                cursor.execute("""
                    SELECT id FROM clients
                    WHERE is_deleted=0 AND is_blocked=0 AND id != ?
                """, (owner_id,))
                results = cursor.fetchall()
                all_users.update(uid for (uid,) in results)

            elif part == "@org":
                cursor.execute("""
                    SELECT id FROM organizations
                    WHERE is_deleted=0 AND is_blocked=0 AND id != ?
                """, (owner_id,))
                results = cursor.fetchall()
                all_users.update(uid for (uid,) in results)

            elif part == "@admin":
                cursor.execute("""
                    SELECT id FROM admins
                    WHERE is_deleted=0 AND is_blocked=0 AND id != ?
                """, (owner_id,))
                results = cursor.fetchall()
                all_users.update(uid for (uid,) in results)

            else:
                try:
                    user_id = int(part)
                    is_found = False

                    cursor.execute("""
                        SELECT id FROM clients
                        WHERE id = ? AND is_deleted=0 AND is_blocked=0
                    """, (user_id,))
                    if cursor.fetchone():
                        all_users.add(user_id)
                        is_found = True

                    if not is_found:
                        cursor.execute("""
                            SELECT id FROM organizations
                            WHERE id = ? AND is_deleted=0 AND is_blocked=0
                        """, (user_id,))
                        if cursor.fetchone():
                            all_users.add(user_id)
                            is_found = True

                    if not is_found:
                        cursor.execute("""
                            SELECT id FROM admins
                            WHERE id = ? AND is_deleted=0 AND is_blocked=0
                        """, (user_id,))
                        if cursor.fetchone():
                            all_users.add(user_id)
                except ValueError:
                    continue

        invites_sent = 0
        for uid in all_users:
            cursor.execute("""
                SELECT id FROM survey_invites
                WHERE survey_id = ? AND user_id = ?
            """, (survey_id, uid))

            existing = cursor.fetchone()
            if existing:
                continue
            else:
                cursor.execute("""
                    INSERT INTO survey_invites
                    (survey_id, user_id, invite_date, status)
                    VALUES (?, ?, ?, 'invited')
                """, (survey_id, uid, invite_date))
                invites_sent += 1

        conn.commit()

        log_event(
            log_type="survey_invite",
            user_id=g.user_id,
            project_id=None,
            description=f"Надіслано запрошення для опитування {survey_id}: {invites_sent} користувачам"
        )

        conn.close()
        return jsonify({"success": True, "message": f"Запрошення надіслані {invites_sent} користувачам"})

    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/surveys/invitations", methods=["GET"])
def get_invitations():
    try:
        user_id = g.user_id
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT si.id, si.survey_id, si.invite_date, si.status, si.pass_date,
                   s.survey_name, s.reward, s.status as survey_status
            FROM survey_invites si
            JOIN surveys s ON s.survey_id=si.survey_id
            WHERE si.user_id=?
              AND si.status IN ('invited','postponed')
              AND s.status IN ('активный','на паузе','отложен')
        """, (user_id,))
        rows = cursor.fetchall()
        conn.close()

        invites = []
        for row in rows:
            invite_id, sid, invite_date, inv_status, pass_date, sname, sreward, sstat = row
            invites.append({
                "inviteId": invite_id,
                "surveyId": sid,
                "surveyName": sname,
                "inviteDate": invite_date,
                "status": inv_status,
                "passDate": pass_date or "",
                "reward": f"{sreward} монет",
                "surveyStatus": sstat
            })

        return jsonify({"success": True, "invitations": invites})
    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        return jsonify({"success": False,"message":str(e)}),500

@app.route("/api/surveys/<survey_id>/pass", methods=["POST"])
def pass_survey(survey_id):
    conn = None
    try:
        user_id = g.user_id
        data = request.get_json()
        answers = data.get("answers", {})

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, status
            FROM survey_invites
            WHERE survey_id=? AND user_id=?
              AND status IN ('invited','postponed')
        """, (survey_id, user_id))
        invite_row = cursor.fetchone()
        if not invite_row:
            conn.close()
            return jsonify({"success": False, "message": "Немає запрошення або вже пройдено/немає доступу"}), 403

        invite_id, old_inv_status = invite_row

        cursor.execute("SELECT answers_folder_link, reward, status FROM surveys WHERE survey_id=?", (survey_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"success": False, "message": "Опитування не знайдено"}), 404

        answers_folder, db_reward, survey_status = row
        if not os.path.exists(answers_folder):
            conn.close()
            return jsonify({"success": False, "message": "Папка answers не знайдена"}), 404

        answers_file_path = os.path.join(answers_folder, f"answer_{survey_id}.txt")
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        log_str = f"{now_str}; user_id={user_id}; "
        question_logs = []
        for q_id, ans_obj in answers.items():
            ans_json = json.dumps(ans_obj, ensure_ascii=False)
            question_logs.append(f"Q{q_id}={ans_json}")
        log_str += " ".join(question_logs)

        with open(answers_file_path, "a", encoding="utf-8") as f:
            f.write(log_str + "\n")

        pass_date = now_str

        cursor.execute("""
            UPDATE survey_invites
            SET status='пройден',
                pass_date=?,
                partial_answers=NULL  
            WHERE id=?
        """, (pass_date, invite_id))

        if db_reward is None:
            db_reward = 0
        else:
            db_reward = int(db_reward)

        cursor.execute("SELECT role FROM global_users WHERE global_id=?", (user_id,))
        role_row = cursor.fetchone()
        
        conn.commit()
        conn.close()
        conn = None
        
        log_event("score_receive", user_id, None, f"Зараховано {db_reward} балів (опитування) {survey_id})")

        if not role_row:
            return jsonify({"success": False, "message": "Користувача не знайдено в global_users!"}), 404

        user_role = role_row[0]
        if user_role == 'admin':
            table_name = 'admins'
        elif user_role == 'client':
            table_name = 'clients'
        else:
            table_name = 'organizations'

        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(f"SELECT points FROM {table_name} WHERE id=?", (user_id,))
        old_points_row = cursor.fetchone()
        if not old_points_row:
            conn.close()
            return jsonify({"success": False, "message": "Користувача не знайдено в таблиці"}), 404

        blockchain_response_data = {
            "survey_id": survey_id,
            "user_id": user_id,
            "answers_hash": hashlib.sha256(str(answers).encode('utf-8')).hexdigest(),
            "timestamp": pass_date
        }
        
        conn.close()
        conn = None
        
        response_hash = add_response_to_blockchain(survey_id, user_id, blockchain_response_data)
        
        log_event(
            log_type="blockchain_response",
            user_id=user_id,
            project_id=None,
            description=f"Відповідь на опитування {survey_id} додано до блокчейну, хеш {response_hash[:10]}..."
        )

        conn = get_db_connection()
        cursor = conn.cursor()
        
        old_points = old_points_row[0]
        new_points = old_points + db_reward
        cursor.execute(f"UPDATE {table_name} SET points=? WHERE id=?", (new_points, user_id))
        conn.commit()
        conn.close()
        conn = None
        
        return jsonify({
            "success": True,
            "message": "Опитування пройдено, бали нараховані, відповідь додано до блокчейну.",
            "pass_date": pass_date,
            "blockchain_hash": response_hash
        })
    except Exception as e:
        if conn:
            try:
                conn.close()
            except:
                pass        
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
    
@app.route("/api/blockchain/validate", methods=["GET"])
def verify_blockchain():
    try:
        is_valid = validate_blockchain()
        
        if is_valid:
            return jsonify({
                "success": True,
                "valid": True,
                "message": "Блокчейн перевірено, цілісність підтверджено."
            })
        else:
            return jsonify({
                "success": True,
                "valid": False,
                "message": "Увага! Виявлено порушення цілісності блокчейну."
            })
    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка перевірки блокчейну: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
    
@app.route("/api/surveys/<survey_id>/blockchain", methods=["GET"])
def get_survey_blockchain(survey_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, block_hash, previous_hash, timestamp, data_hash, nonce
            FROM blockchain_blocks
            WHERE survey_id = ?
            ORDER BY id
        """, (survey_id,))
        blocks_rows = cursor.fetchall()
        
        cursor.execute("""
            SELECT id, block_hash, user_id, response_hash, timestamp
            FROM blockchain_responses
            WHERE survey_id = ?
            ORDER BY timestamp DESC
        """, (survey_id,))
        responses_rows = cursor.fetchall()
        
        conn.close()
        
        blocks = []
        for row in blocks_rows:
            block_id, block_hash, previous_hash, timestamp, data_hash, nonce = row
            blocks.append({
                "block_id": block_id,
                "block_hash": block_hash,
                "previous_hash": previous_hash,
                "timestamp": timestamp,
                "data_hash": data_hash,
                "nonce": nonce
            })
        
        responses = []
        for row in responses_rows:
            resp_id, block_hash, user_id, response_hash, timestamp = row
            responses.append({
                "response_id": resp_id,
                "block_hash": block_hash,
                "user_id": user_id,
                "response_hash": response_hash,
                "timestamp": timestamp
            })
        
        return jsonify({
            "success": True,
            "survey_id": survey_id,
            "blockchain_blocks": blocks,
            "blockchain_responses": responses
        })
    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка отримання блокчейну: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
    
@app.route("/api/surveys/<survey_id>/verify", methods=["GET"])
def verify_survey_integrity(survey_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, block_hash, previous_hash, timestamp, data_hash, nonce
            FROM blockchain_blocks
            WHERE survey_id = ?
            ORDER BY id
        """, (survey_id,))
        blocks = cursor.fetchall()
        
        if not blocks:
            conn.close()
            return jsonify({
                "success": True,
                "valid": False,
                "message": "Опитування не знайдено в блокчейні."
            })
        
        previous_hash = "0" * 64  
        for block in blocks:
            block_id, block_hash, prev_hash, timestamp, data_hash, nonce = block
            
            if prev_hash != previous_hash:
                conn.close()
                return jsonify({
                    "success": True,
                    "valid": False,
                    "message": f"Порушення цілісності блоку {block_id}: невідповідність попереднього хешу."
                })
                
            computed_hash = calculate_hash(block_id, prev_hash, timestamp, data_hash, nonce)
            if computed_hash != block_hash:
                conn.close()
                return jsonify({
                    "success": True,
                    "valid": False,
                    "message": f"Порушення цілісності блоку {block_id}: невідповідність обчисленого хешу."
                })
                
            previous_hash = block_hash
        
        answers_file_path = None
        cursor.execute("SELECT answers_folder_link FROM surveys WHERE survey_id=?", (survey_id,))
        row = cursor.fetchone()
        if row:
            answers_folder = row[0]
            answers_file_path = os.path.join(answers_folder, f"answer_{survey_id}.txt")
        
        conn.close()
        
        if answers_file_path and os.path.exists(answers_file_path):
            with open(answers_file_path, "r", encoding="utf-8") as f:
                answers_content = f.read()
                
            answers_hash = hashlib.sha256(answers_content.encode('utf-8')).hexdigest()

            return jsonify({
                "success": True,
                "valid": True,
                "message": "Цілісність опитування підтверджено в блокчейні.",
                "survey_id": survey_id,
                "answers_hash": answers_hash
            })
        
        return jsonify({
            "success": True,
            "valid": True,
            "message": "Цілісність блоків опитування підтверджено в блокчейні.",
            "survey_id": survey_id
        })
        
    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка перевірки цілісності: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/surveys/my", methods=["GET"])
def get_my_surveys():
    try:
        user_id = g.user_id
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT survey_id, owner_id, survey_name, status, reward,
                   creation_date, end_date
            FROM surveys
            WHERE owner_id = ?
              AND status NOT IN ('черновик', 'завершён')
        """, (user_id,))
        rows_my = cursor.fetchall()

        cursor.execute("""
            SELECT survey_id, owner_id, survey_name, status, reward,
                   creation_date, end_date
            FROM surveys
            WHERE owner_id = ?
              AND status = 'черновик'
        """, (user_id,))
        rows_drafts = cursor.fetchall()

        cursor.execute("""
            SELECT survey_id, owner_id, survey_name, status, reward,
                   creation_date, end_date
            FROM surveys
            WHERE owner_id = ?
              AND status = 'завершён'
        """, (user_id,))
        rows_finished = cursor.fetchall()

        cursor.execute("""
            SELECT s.survey_id, s.owner_id, s.survey_name, s.status,
                   s.reward, s.creation_date, s.end_date,
                   si.pass_date
            FROM survey_invites si
            JOIN surveys s ON s.survey_id = si.survey_id
            WHERE si.user_id = ?
              AND si.status = 'пройден'
        """, (user_id,))
        rows_passed = cursor.fetchall()

        conn.close()

        def row_to_dict(row, with_completed=False):
            d = {
                "surveyId": row[0],
                "ownerId": row[1],
                "surveyName": row[2],
                "status": row[3],
                "reward": f"{row[4]} монет",
                "creationDate": row[5] or "",
                "endDate": row[6] or "",
            }
            if with_completed:
                d["completedDate"] = row[7] or ""
            else:
                d["completedDate"] = ""
            return d

        mySurveys = [row_to_dict(r) for r in rows_my]
        draftSurveys = [row_to_dict(r) for r in rows_drafts]
        finishedSurveys = [row_to_dict(r) for r in rows_finished]
        passedSurveys = [row_to_dict(r, with_completed=True) for r in rows_passed]

        return jsonify({
            "success": True,
            "mySurveys": mySurveys,
            "draftSurveys": draftSurveys,
            "finishedSurveys": finishedSurveys,
            "passedSurveys": passedSurveys
        })
    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/surveys/<survey_id>/postpone", methods=["POST"])
def postpone_survey(survey_id):

    try:
        user_id = g.user_id
        data = request.get_json() or {}
        current_q = int(data.get("current_question", 0))
        partial_answers = data.get("partial_answers") or {}
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, status
            FROM survey_invites
            WHERE survey_id=? AND user_id=?
              AND status IN ('invited','postponed')
        """, (survey_id, user_id))
        invite_row = cursor.fetchone()
        if not invite_row:
            conn.close()
            return jsonify({"success": False, "message": "Немає запрошення або вже пройдено/немає доступу"}), 403

        invite_id, old_status = invite_row

        cursor.execute("""
            UPDATE survey_invites
            SET status='postponed',
                current_question=?,
                partial_answers=?
            WHERE id=?
        """, (current_q, json.dumps(partial_answers, ensure_ascii=False), invite_id))

        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Опитування відкладено"})
    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/surveys/<survey_id>/continue", methods=["GET"])
def continue_survey(survey_id):
    try:
        user_id = g.user_id
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT status, current_question, partial_answers
            FROM survey_invites
            WHERE survey_id=? AND user_id=?
        """, (survey_id, user_id))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({"success": False, "message": "Запрошення не знайдено"}), 404

        status, current_q, partial_ans = row
        if not partial_ans:
            partial_ans = "{}"

        if status == 'postponed':
            return jsonify({
                "success": True,
                "current_question": current_q,
                "partial_answers": json.loads(partial_ans)
            })
        else:
            return jsonify({
                "success": True,
                "current_question": 0,
                "partial_answers": {}
            })
    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/surveys/<survey_id>/analytics", methods=["GET"])
def get_survey_analytics(survey_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT survey_id FROM surveys WHERE survey_id=?", (survey_id,))
        row_survey = cursor.fetchone()
        if not row_survey:
            conn.close()
            return jsonify({"success": False, "message": "Опитування не знайдено"}), 404

        cursor.execute("""
            SELECT COUNT(*)
            FROM survey_invites
            WHERE survey_id=?
        """, (survey_id,))
        invited_count = cursor.fetchone()[0] or 0

        cursor.execute("""
            SELECT COUNT(*)
            FROM survey_invites
            WHERE survey_id=? AND status='пройден'
        """, (survey_id,))
        completed_count = cursor.fetchone()[0] or 0

        cursor.execute("""
            SELECT COUNT(*)
            FROM survey_invites
            WHERE survey_id=? AND status='postponed'
        """, (survey_id,))
        postponed_count = cursor.fetchone()[0] or 0

        cursor.execute("""
            SELECT COUNT(*)
            FROM survey_invites
            WHERE survey_id=?
              AND status='invited'
        """, (survey_id,))
        in_progress_count = cursor.fetchone()[0] or 0


        cursor.execute("""
            SELECT AVG(
                (strftime('%s', pass_date) - strftime('%s', invite_date)) / 60.0
            )
            FROM survey_invites
            WHERE survey_id=? AND status='пройден'
              AND pass_date IS NOT NULL
              AND invite_date IS NOT NULL
        """, (survey_id,))
        avg_time_minutes = cursor.fetchone()[0]
        if avg_time_minutes is None:
            avg_time_minutes = 0.0

        cursor.execute("SELECT anketa_folder_link FROM surveys WHERE survey_id=?", (survey_id,))
        row_folder = cursor.fetchone()
        anketa_folder = row_folder[0]
        anketa_file_path = os.path.join(anketa_folder, "anketa.json")

        question_analytics = []
        if os.path.exists(anketa_file_path):
            with open(anketa_file_path, "r", encoding="utf-8") as f:
                anketa_data = json.load(f)

            answers_folder = os.path.join(os.path.dirname(anketa_folder), "answers")
            answers_file_path = os.path.join(answers_folder, f"answer_{survey_id}.txt")

            stats_map = {}
            open_map = {}

            if os.path.exists(answers_file_path):
                with open(answers_file_path, "r", encoding="utf-8") as f_ans:
                    lines = f_ans.readlines()

                for line in lines:
                    line = line.strip()
                    parts = line.split("Q")

                    for i in range(1, len(parts)):
                        chunk = parts[i]
                        subp = chunk.split("=[", 1)
                        qid_and_rest = subp[0]
                        qid = qid_and_rest.replace("}", "")

                        if len(subp) < 2:
                            continue
                        arr_part = subp[1]
                        arr_part = arr_part.split("]", 1)[0]
                        arr_part = arr_part.strip()
                        if arr_part.startswith(","):
                            arr_part = arr_part[1:].strip()

                        selected_answers = [x.strip() for x in arr_part.split(",") if x.strip()]

                        if qid not in stats_map:
                            stats_map[qid] = {}
                        for ansv in selected_answers:
                            if ansv not in stats_map[qid]:
                                stats_map[qid][ansv] = 0
                            stats_map[qid][ansv] += 1

            for q_obj in anketa_data:
                qid = q_obj.get("id")
                qtype = q_obj.get("type")
                title = q_obj.get("title", "")
                if not qid:
                    continue

                q_stat = stats_map.get(qid, {})
                total_answers_for_q = sum(q_stat.values())

                answers_list = []
                for ans_val, ans_count in q_stat.items():
                    percent = 0.0
                    if total_answers_for_q > 0:
                        percent = (ans_count / total_answers_for_q) * 100.0
                    answers_list.append({
                        "answerValue": ans_val,
                        "count": ans_count,
                        "percent": round(percent, 2)
                    })

                question_analytics.append({
                    "questionId": qid,
                    "questionType": qtype,
                    "title": title,
                    "totalAnswers": total_answers_for_q,
                    "answersDetail": answers_list,
                })

        conn.close()

        return jsonify({
            "success": True,
            "analytics": {
                "invited_count": invited_count,
                "completed_count": completed_count,
                "postponed_count": postponed_count,
                "in_progress_count": in_progress_count,
                "average_time_minutes": round(avg_time_minutes, 2),
                "question_analytics": question_analytics
            }
        })
    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/surveys/<survey_id>/answers/download", methods=["GET"])
def download_survey_answers(survey_id):
    try:
        doc_format = request.args.get("format", "csv").lower()

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT answers_folder_link FROM surveys WHERE survey_id=?", (survey_id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({"success": False, "message": "Опитування не знайдено"}), 404

        answers_folder = row[0]
        if not answers_folder or not os.path.exists(answers_folder):
            return jsonify({"success": False, "message": "Папка answers не знайдена"}), 404

        answers_file_path = os.path.join(answers_folder, f"answer_{survey_id}.txt")
        if not os.path.exists(answers_file_path):
            return jsonify({"success": False, "message": "Файл відповідей відсутній чи немає відповідей"}), 404

        all_rows = []

        with open(answers_file_path, "r", encoding="utf-8") as f_ans:
            lines = f_ans.readlines()

        for line in lines:
            line = line.strip()
            if not line:
                continue

            match_header = re.match(r"^(.*?)\;\s*user_id=(\S+)\;\s+(.*)$", line)
            if not match_header:
                continue

            dt_str = match_header.group(1).strip()
            user_id_str = match_header.group(2).strip()
            questions_part = match_header.group(3)

            pattern = r"Q([^\s=]+)=(\{.*?\})(?=\sQ|$)"
            matches = re.findall(pattern, questions_part)

            for (q_id_raw, json_str) in matches:
                qid = q_id_raw.strip()
                try:
                    ans_data = json.loads(json_str)
                except:
                    continue

                custom_txt = ans_data.get("custom_text", "")

                ans_dict = {k: v for k, v in ans_data.items() if k != "custom_text"}
                answers_str = json.dumps(ans_dict, ensure_ascii=False)

                all_rows.append((dt_str, user_id_str, qid, answers_str, custom_txt))

        filename = f"survey_{survey_id}_answers.{doc_format}"

        if doc_format in ("csv", "xls"):
            output = io.StringIO()
            output.write("datetime;user_id;question_id;answers;custom_text\n")
            for row in all_rows:
                line_csv = f"{row[0]};{row[1]};{row[2]};{row[3]};{row[4]}\n"
                output.write(line_csv)

            output.seek(0)
            if doc_format == "csv":
                mime_type = "text/csv"
            else:
                mime_type = "application/vnd.ms-excel"

            return Response(
                output.getvalue(),
                mimetype=mime_type,
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        elif doc_format == "txt":
            output = io.StringIO()
            output.write("All answers:\n\n")

            last_datetime = None
            for row in all_rows:
                current_datetime = row[0]
                if last_datetime is not None and current_datetime != last_datetime:
                    output.write("\n\n")

                output.write(
                    f"DateTime={row[0]} | User={row[1]} | Q={row[2]} | "
                    f"Answers={row[3]} | Custom={row[4]}\n"
                )
                last_datetime = current_datetime

            output.seek(0)
            return Response(
                output.getvalue(),
                mimetype="text/plain",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )

        else:
            return jsonify({
                "success": True,
                "survey_id": survey_id,
                "answers_count": len(all_rows),
                "answers": [
                    {
                        "datetime": r[0],
                        "user_id": r[1],
                        "question_id": r[2],
                        "answers": r[3],
                        "custom_text": r[4]
                    }
                    for r in all_rows
                ]
            })

    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        return jsonify({"success": False, "message": str(e)}), 500

def get_chart_type_for_question(qtype):
    if qtype in ["q301", "q302", "q303", "q304", "q305", "q201", "q202"]:
        return None

    single_choice_types = ["q101", "q103", "q201"]
    star_types = ["q405"]
    matrix_types = ["q501","q502","q503","q504","q505","q506","q507"]
    scale_types = ["q401","q402","q403","q404"]

    if qtype in single_choice_types:
        return "pie"
    if qtype in star_types:
        return "bar"
    if qtype in matrix_types:
        return "bar"
    if qtype in scale_types:
        return "bar"

    return "bar"

def convert_table_answer_to_text(table_data, qinfo):
    row_map = qinfo.get("row_map", {})
    col_map = qinfo.get("col_map", {})

    lines = []
    for rowId, colIds in table_data.items():
        row_text = row_map.get(rowId, rowId)
        col_texts = [col_map.get(cid, cid) for cid in colIds]
        line = f"{', '.join(col_texts)}"
        lines.append(line)

    return " | ".join(lines)

def convert_sections_answer_to_text(sections_data, qinfo):
    section_map = qinfo.get("section_map", {})
    answers_map = qinfo.get("answers_map", {})

    lines = []
    for section_id, answers_list in sections_data.items():
        sec_text = section_map.get(section_id, section_id)
        ans_texts = [answers_map.get(aid, aid) for aid in answers_list]
        line = f"{', '.join(ans_texts)}"
        lines.append(line)

    return " | ".join(lines)

def _build_analytics_for_survey(survey_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM survey_invites WHERE survey_id=?", (survey_id,))
    invited_count = cursor.fetchone()[0] or 0

    cursor.execute("""
        SELECT COUNT(*)
        FROM survey_invites
        WHERE survey_id=? AND status='пройден'
    """, (survey_id,))
    completed_count = cursor.fetchone()[0] or 0

    cursor.execute("""
        SELECT COUNT(*)
        FROM survey_invites
        WHERE survey_id=? AND status='postponed'
    """, (survey_id,))
    postponed_count = cursor.fetchone()[0] or 0

    cursor.execute("""
        SELECT COUNT(*)
        FROM survey_invites
        WHERE survey_id=? AND status='invited'
    """, (survey_id,))
    in_progress_count = cursor.fetchone()[0] or 0

    cursor.execute("""
        SELECT AVG(
            (strftime('%s', pass_date) - strftime('%s', invite_date)) / 60.0
        )
        FROM survey_invites
        WHERE survey_id=? AND status='пройден'
          AND pass_date IS NOT NULL
          AND invite_date IS NOT NULL
    """, (survey_id,))
    avg_time = cursor.fetchone()[0]
    if not avg_time:
        avg_time = 0.0

    cursor.execute("SELECT anketa_folder_link, answers_folder_link FROM surveys WHERE survey_id=?", (survey_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return {
            "invited_count": invited_count,
            "completed_count": completed_count,
            "postponed_count": postponed_count,
            "in_progress_count": in_progress_count,
            "average_time_minutes": round(avg_time, 2),
            "question_analytics": []
        }
    anketa_folder, answers_folder = row
    conn.close()

    anketa_file_path = os.path.join(anketa_folder, "anketa.json.enc")

    if not os.path.exists(anketa_file_path):
        return {
            "invited_count": invited_count,
            "completed_count": completed_count,
            "postponed_count": postponed_count,
            "in_progress_count": in_progress_count,
            "average_time_minutes": round(avg_time, 2),
            "question_analytics": []
        }

    with open(anketa_file_path, "r", encoding="utf-8") as f:
        encrypted_content = f.read()

    try:
        decrypted_str = decrypt_data(encrypted_content)
        anketa_data = json.loads(decrypted_str)
    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка декодування анкети: {str(e)}")
        anketa_data = []

    if not isinstance(anketa_data, list):
        anketa_data = []

    question_map = {}

    for qobj in anketa_data:
        qid = qobj.get("id")
        if not qid:
            continue
        qtype = qobj.get("type")
        qtitle = qobj.get("title", f"Q {qid}")

        answers_map = {}
        if isinstance(qobj.get("answers"), list):
            for ans in qobj["answers"]:
                ans_id = ans.get("id")
                ans_text = ans.get("text", ans_id)
                if ans_id:
                    answers_map[ans_id] = ans_text

        row_map = {}
        col_map = {}
        if "rows" in qobj:
            for r in qobj["rows"]:
                rid = r.get("id")
                rtext = r.get("text", rid)
                row_map[rid] = rtext
        if "columns" in qobj:
            for c in qobj["columns"]:
                cid = c.get("id")
                ctext = c.get("text", cid)
                col_map[cid] = ctext

        section_map = {}
        if "sections" in qobj:
            for s in qobj["sections"]:
                sid = s.get("id")
                stext = s.get("text", sid)
                section_map[sid] = stext

        question_map[qid] = {
            "type": qtype,
            "title": qtitle,
            "answers_map": answers_map,
            "row_map": row_map,
            "col_map": col_map,
            "section_map": section_map
        }

    stats_map = {}
    answers_file = os.path.join(answers_folder, f"answer_{survey_id}.txt")

    if os.path.exists(answers_file):
        with open(answers_file, "r", encoding="utf-8") as f_ans:
            lines = f_ans.readlines()

        pattern = r"Q([^\s=]+)=(\{.*?\})(?=\sQ|$)"

        for line in lines:
            line = line.strip()
            if not line:
                continue

            matches = re.findall(pattern, line)
            for (question_id_raw, json_str) in matches:
                qid = question_id_raw.strip()
                try:
                    ans_data = json.loads(json_str)
                except:
                    continue

                if qid not in stats_map:
                    stats_map[qid] = {
                        "counts": {},
                        "typedValues": [],
                        "all_raw_answers": []
                    }

                qinfo = question_map.get(qid, {})
                qtype = qinfo.get("type", "")

                readable_str = ""

                for k, v in ans_data.items():
                    if k == "custom_text":
                        if qtype in ["q301", "q302", "q303", "q304", "q305"]:
                            stats_map[qid]["typedValues"].append(v)
                        continue

                    elif k == "selected_answers" and isinstance(v, list):
                        texts = [qinfo["answers_map"].get(aid, aid) for aid in v]
                        readable_str += "Обрано: " + ", ".join(texts)
                        for t in texts:
                            stats_map[qid]["counts"][t] = stats_map[qid]["counts"].get(t, 0) + 1

                    elif k == "table":
                        table_text = convert_table_answer_to_text(v, qinfo)
                        readable_str += f"{table_text}"
                        stats_map[qid]["counts"][table_text] = stats_map[qid]["counts"].get(table_text, 0) + 1

                    elif k.startswith("sections") and isinstance(v, dict):
                        sect_text = convert_sections_answer_to_text(v, qinfo)
                        readable_str += f"{sect_text}"
                        stats_map[qid]["counts"][sect_text] = stats_map[qid]["counts"].get(sect_text, 0) + 1

                    elif k == "imageUrl":
                        readable_str += f"(Зображення) {v}"
                        stats_map[qid]["counts"][v] = stats_map[qid]["counts"].get(v, 0) + 1

                    else:
                        val_str = f"{k}={v}"
                        readable_str += val_str
                        stats_map[qid]["counts"][val_str] = stats_map[qid]["counts"].get(val_str, 0) + 1

                    readable_str += " | "

                if readable_str.strip():
                    stats_map[qid]["all_raw_answers"].append(readable_str.strip())

    question_analytics = []

    for qobj in anketa_data:
        qid = qobj.get("id")
        if not qid:
            continue
        qtype = qobj.get("type", "")
        title = qobj.get("title", f"Q {qid}")

        rec = stats_map.get(qid, {"counts": {}, "typedValues": [], "all_raw_answers": []})
        counts_dict = rec["counts"]
        typed_vals = rec["typedValues"]
        all_raw = rec["all_raw_answers"]
        total_cnt = sum(counts_dict.values())

        answers_detail = []
        for ans_text, ccount in counts_dict.items():
            prc = (ccount / total_cnt * 100.0) if total_cnt else 0
            answers_detail.append({
                "answerValue": ans_text,
                "count": ccount,
                "percent": round(prc, 1)
            })

        avg_val = None
        if qtype in ["q301", "q302"]:
            numeric_list = []
            for x in typed_vals:
                try:
                    numeric_list.append(float(x.replace(",", ".")))
                except:
                    pass
            if numeric_list:
                avg_val = round(sum(numeric_list)/len(numeric_list), 2)

        chart_type = get_chart_type_for_question(qtype)

        question_analytics.append({
            "questionId": qid,
            "questionType": qtype,
            "title": title,
            "chartType": chart_type,
            "answersDetail": answers_detail,
            "typedValues": typed_vals,
            "allRawAnswers": all_raw,
            "averageValue": avg_val
        })

    return {
        "invited_count": invited_count,
        "completed_count": completed_count,
        "postponed_count": postponed_count,
        "in_progress_count": in_progress_count,
        "average_time_minutes": round(avg_time, 2),
        "question_analytics": question_analytics
    }
@app.route("/api/surveys/<survey_id>/analytics/download", methods=["GET"])
def download_survey_dashboards(survey_id):
    try:
        doc_format = request.args.get("format", "html").lower()

        analytics = _build_analytics_for_survey(survey_id)
        analytics_json = json.dumps(analytics, ensure_ascii=False)

        content_html = f"""
        <!DOCTYPE html>
        <html lang="uk">
        <head>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Дашборди опитування {survey_id}</title>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          <style>
            :root {{
              --accent-primary: #FFB52E;
              --owl-accent: #FFB52E;
              --owl-secondary: #E98A15;
              --container-padding: 1rem;
              --font-size-lg: 1.125rem;
              --font-size-md: 1rem;
              --font-size-sm: 0.875rem;
              --text-secondary: #666;
              --text-primary: #000;
              --border-radius-lg: 1rem;
              --border-radius-md: 0.5rem;
              --border-radius-xl: 2rem;
              --shadow-md: 0 4px 15px rgba(0, 0, 0, 0.1);
              --shadow-lg: 0 6px 25px rgba(0, 0, 0, 0.15);
              --shadow-xl: 0 8px 30px rgba(0, 0, 0, 0.2);
              --background-primary: #fff;
              --border-color: #eee;
              --font-weight-bold: 700;
            }}
            
            * {{
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }}
            
            body {{
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              background-color: #f9f9f9;
              color: var(--text-primary);
              line-height: 1.6;
              padding: 2rem;
            }}
            
            .dashboard-container {{
              max-width: 1200px;
              margin: 0 auto;
              background-color: var(--background-primary);
              border-radius: var(--border-radius-lg);
              box-shadow: var(--shadow-lg);
              padding: 2rem;
            }}
            
            h1 {{
              color: var(--text-primary);
              font-size: 1.8rem;
              margin-bottom: 1.5rem;
              padding-bottom: 1rem;
              border-bottom: 3px solid var(--accent-primary);
              display: inline-block;
            }}
            
            h2 {{
              color: var(--text-primary);
              font-size: 1.5rem;
              margin-bottom: 1rem;
              padding-left: 0.5rem;
              border-left: 4px solid var(--owl-accent);
            }}
            
            h4 {{
              color: var(--text-secondary);
              font-size: var(--font-size-md);
              margin: 1rem 0 0.5rem;
            }}
            
            .stats-overview {{
              display: flex;
              flex-wrap: wrap;
              gap: 1rem;
              justify-content: space-between;
              margin-bottom: 2rem;
              padding: 1rem;
              background-color: #f8f8f8;
              border-radius: var(--border-radius-md);
              box-shadow: var(--shadow-md);
            }}
            
            .stat-card {{
              flex: 1;
              min-width: 150px;
              padding: 1rem;
              background-color: white;
              border-radius: var(--border-radius-md);
              box-shadow: var(--shadow-md);
              text-align: center;
              transition: transform 0.2s ease;
            }}
            
            .stat-card:hover {{
              transform: translateY(-5px);
            }}
            
            .stat-label {{
              font-size: var(--font-size-sm);
              color: var(--text-secondary);
              margin-bottom: 0.3rem;
            }}
            
            .stat-value {{
              font-size: var(--font-size-lg);
              font-weight: var(--font-weight-bold);
              color: var(--owl-secondary);
            }}
            
            .chart-container {{
              width: 100%;
              height: 400px;
              margin-bottom: 2.5rem;
              padding: 1rem;
              background: white;
              border-radius: var(--border-radius-md);
              box-shadow: var(--shadow-md);
            }}
            
            .question-block {{
              border: 1px solid var(--border-color);
              border-radius: var(--border-radius-md);
              padding: 1.5rem;
              margin-bottom: 2rem;
              box-shadow: var(--shadow-md);
              transition: box-shadow 0.3s ease;
              background-color: white;
            }}
            
            .question-block:hover {{
              box-shadow: var(--shadow-lg);
            }}
            
            .question-header {{
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 1rem;
              padding-bottom: 0.5rem;
              border-bottom: 1px solid var(--border-color);
            }}
            
            .question-meta {{
              background-color: #f8f8f8;
              padding: 0.5rem 1rem;
              border-radius: var(--border-radius-md);
              font-size: var(--font-size-sm);
            }}
            
            table.answer-stats {{
              width: 100%;
              border-collapse: collapse;
              margin: 1rem 0;
              box-shadow: var(--shadow-md);
              border-radius: var(--border-radius-md);
              overflow: hidden;
            }}
            
            table.answer-stats th,
            table.answer-stats td {{
              padding: 0.8rem 1rem;
              text-align: left;
              border: none;
            }}
            
            table.answer-stats th {{
              background-color: var(--owl-accent);
              color: white;
              font-weight: var(--font-weight-bold);
            }}
            
            table.answer-stats tr {{
              background-color: white;
              border-bottom: 1px solid var(--border-color);
            }}
            
            table.answer-stats tr:last-child {{
              border-bottom: none;
            }}
            
            table.answer-stats tr:nth-child(even) {{
              background-color: #f8f8f8;
            }}
            
            table.answer-stats td:last-child,
            table.answer-stats th:last-child {{
              text-align: center;
            }}
            
            ul {{
              list-style-position: inside;
              margin: 1rem 0;
              padding-left: 1rem;
            }}
            
            li {{
              margin-bottom: 0.5rem;
              line-height: 1.5;
            }}
            
            @media (max-width: 768px) {{
              body {{
                padding: 1rem;
              }}
              
              .dashboard-container {{
                padding: 1rem;
              }}
              
              .stats-overview {{
                flex-direction: column;
              }}
              
              .chart-container {{
                height: 300px;
              }}
            }}
          </style>
        </head>
        <body>
          <div class="dashboard-container">
            <h1>Дашборди опитування {survey_id}</h1>
            
            <div class="stats-overview">
              <div class="stat-card">
                <div class="stat-label">Запрошені</div>
                <div class="stat-value">{analytics["invited_count"]}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Пройдено</div>
                <div class="stat-value">{analytics["completed_count"]}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Відкладено</div>
                <div class="stat-value">{analytics["postponed_count"]}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">У процесі</div>
                <div class="stat-value">{analytics["in_progress_count"]}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Середній час (хв)</div>
                <div class="stat-value">{analytics["average_time_minutes"]}</div>
              </div>
            </div>

            <div class="chart-container">
              <canvas id="overallChart"></canvas>
            </div>

            <div id="questionsBlock"></div>
          </div>

          <script>
            const analyticsData = {analytics_json};

            window.addEventListener("DOMContentLoaded", () => {{
                const c1 = document.getElementById("overallChart").getContext("2d");
                new Chart(c1, {{
                  type: 'bar',
                  data: {{
                    labels: ['Запрошені','Пройдено','Відкладено','У процесі'],
                    datasets: [{{
                      label: 'Респонденти',
                      data: [
                        analyticsData.invited_count,
                        analyticsData.completed_count,
                        analyticsData.postponed_count,
                        analyticsData.in_progress_count
                      ],
                      backgroundColor: [
                        '#FFB52E',
                        '#E98A15',
                        '#FFD700',
                        '#FF9F45'
                      ],
                      borderColor: [
                        '#E98A15',
                        '#D17000',
                        '#FFC000',
                        '#FF8C00'
                      ],
                      borderWidth: 1
                    }}]
                  }},
                  options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {{
                      y: {{ 
                        beginAtZero: true,
                        grid: {{
                          color: '#f0f0f0'
                        }}
                      }},
                      x: {{
                        grid: {{
                          display: false
                        }}
                      }}
                    }},
                    plugins: {{
                      legend: {{
                        display: false
                      }}
                    }}
                  }}
                }});

                const questionsBlock = document.getElementById("questionsBlock");

                analyticsData.question_analytics.forEach((q, idx) => {{
                    const qDiv = document.createElement("div");
                    qDiv.className = "question-block";
                    
                    // Question header
                    const headerDiv = document.createElement("div");
                    headerDiv.className = "question-header";
                    
                    const titleH2 = document.createElement("h2");
                    titleH2.textContent = "Питання";
                    headerDiv.appendChild(titleH2);
                    
                    const metaDiv = document.createElement("div");
                    metaDiv.className = "question-meta";
                    metaDiv.innerHTML = `<b>ID:</b> ${{q.questionId}}, <b>Тип:</b> ${{q.questionType}}`;
                    headerDiv.appendChild(metaDiv);
                    
                    qDiv.appendChild(headerDiv);

                    // Raw answers if available
                    if (Array.isArray(q.allRawAnswers) && q.allRawAnswers.length > 0) {{
                        let rawHtml = "<h4>Відповіді:</h4><ul>";
                        q.allRawAnswers.forEach(r => {{
                            rawHtml += `<li>${{r}}</li>`;
                        }});
                        rawHtml += "</ul>";
                        
                        const rawDiv = document.createElement("div");
                        rawDiv.innerHTML = rawHtml;
                        qDiv.appendChild(rawDiv);
                    }}

                    // Typed values if available
                    if (Array.isArray(q.typedValues) && q.typedValues.length > 0) {{
                        let tvHtml = "<h4>Введені значення:</h4><ul>";
                        q.typedValues.forEach(tv => {{
                            tvHtml += `<li>${{tv}}</li>`;
                        }});
                        tvHtml += "</ul>";
                        
                        const tvDiv = document.createElement("div");
                        tvDiv.innerHTML = tvHtml;
                        qDiv.appendChild(tvDiv);
                    }}

                    // Details table if available
                    if (q.answersDetail && q.answersDetail.length > 0) {{
                        const tableDiv = document.createElement("div");
                        tableDiv.innerHTML = `
                          <h4>Статистика відповідей:</h4>
                          <table class="answer-stats">
                            <thead>
                              <tr><th>Відповідь</th><th>Кількість</th><th>%</th></tr>
                            </thead>
                            <tbody>
                              ${{q.answersDetail.map(a => `
                                <tr>
                                  <td>${{a.answerValue}}</td>
                                  <td>${{a.count}}</td>
                                  <td>${{a.percent}}</td>
                                </tr>
                              `).join('')}}
                            </tbody>
                          </table>
                        `;
                        qDiv.appendChild(tableDiv);
                    }}

                    // Chart if needed
                    if (q.chartType === null) {{
                        const p = document.createElement("p");
                        p.textContent = "Для цього питання діаграма не потрібна";
                        p.style.color = "#888";
                        p.style.fontStyle = "italic";
                        p.style.textAlign = "center";
                        p.style.margin = "1rem 0";
                        qDiv.appendChild(p);
                    }} else {{
                        const cDiv = document.createElement("div");
                        cDiv.className = "chart-container";
                        const canvasId = `qchart_${{idx}}`;
                        cDiv.innerHTML = `<canvas id="${{canvasId}}"></canvas>`;
                        qDiv.appendChild(cDiv);

                        setTimeout(() => {{
                            const ctx = document.getElementById(canvasId).getContext("2d");
                            const labels = q.answersDetail.map(d => d.answerValue);
                            const dataVals = q.answersDetail.map(d => d.count);
                            
                            // Chart colors
                            const backgroundColors = [
                              '#FFB52E', '#E98A15', '#FFD700', '#FF9F45', 
                              '#FFAA00', '#FF8C00', '#FFA07A', '#FFCE54'
                            ];
                            
                            let chartOptions = {{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {{
                                legend: {{
                                  position: q.chartType === 'pie' ? 'right' : 'top'
                                }}
                              }}
                            }};
                            
                            if (q.chartType !== 'pie') {{
                              chartOptions.scales = {{
                                y: {{ 
                                  beginAtZero: true,
                                  grid: {{
                                    color: '#f0f0f0'
                                  }}
                                }},
                                x: {{
                                  grid: {{
                                    display: false
                                  }}
                                }}
                              }};
                            }}
                            
                            new Chart(ctx, {{
                                type: q.chartType,
                                data: {{
                                    labels: labels,
                                    datasets: [{{
                                        label: 'Відповіді',
                                        data: dataVals,
                                        backgroundColor: backgroundColors.slice(0, dataVals.length),
                                        borderColor: q.chartType === 'pie' ? '#fff' : backgroundColors.slice(0, dataVals.length),
                                        borderWidth: q.chartType === 'pie' ? 2 : 1
                                    }}]
                                }},
                                options: chartOptions
                            }});
                        }}, 0);
                    }}

                    questionsBlock.appendChild(qDiv);
                }});
            }});
          </script>
        </body>
        </html>
        """

        tmp_dir = "./tmp"
        os.makedirs(tmp_dir, exist_ok=True)
        tmp_file_path = os.path.join(tmp_dir, f"dashboards_{survey_id}.{doc_format}")
        with open(tmp_file_path, "w", encoding="utf-8") as f:
            f.write(content_html)

        return send_file(
            tmp_file_path,
            as_attachment=True,
            download_name=f"dashboards_{survey_id}.{doc_format}",
            mimetype="text/html"
        )
    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        return jsonify({"success": False, "message": str(e)}), 500
    
def get_answers_folder(survey_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT answers_folder_link FROM surveys WHERE survey_id=?", (survey_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row[0]
    return None

@app.route("/api/surveys/<survey_id>/all-answers", methods=["GET"])
def get_all_survey_answers(survey_id):

    answers_folder = get_answers_folder(survey_id)
    if not answers_folder:
        return jsonify({"success": False, "message": "Не знайдено папку answers для опитування"}), 404

    answers_file = os.path.join(answers_folder, f"answer_{survey_id}.txt")
    if not os.path.exists(answers_file):
        return jsonify({"success": True, "data": []})

    user_answers_map = {}

    with open(answers_file, "r", encoding="utf-8") as f:
        lines = f.readlines()

    for line in lines:
        line = line.strip()

        parts = line.split(";")
        if len(parts) < 2:
            continue

        user_part = parts[1].strip()
        if not user_part.startswith("user_id="):
            continue
        user_id_str = user_part.replace("user_id=", "").strip()

        if user_id_str not in user_answers_map:
            user_answers_map[user_id_str] = {
                "userId": user_id_str,
                "answers": {}
            }

        question_block = "".join(parts[2:]).strip()

        tokens = question_block.split("Q")

        for t in tokens:
            t = t.strip()
            if not t:
                continue
            sub = t.split("=", 1)
            if len(sub) < 2:
                continue
            qid = sub[0].strip()
            raw_json = sub[1].strip()

            try:
                answer_data = json.loads(raw_json)
            except:
                answer_data = {}

            user_answers_map[user_id_str]["answers"][qid] = answer_data

    result_list = list(user_answers_map.values())

    return jsonify({"success": True, "data": result_list})

@app.route("/api/surveys/<survey_id>/notify", methods=["POST"])
def notify_survey_users(survey_id):
    data = request.json
    if not data:
        return jsonify({"success": False, "message": "Немає вхідних даних"}), 400

    notify_type = data.get("notifyType")
    text = data.get("text", "").strip()
    all_users = data.get("all", False)
    single_user_id = data.get("userId")
    recipient_group = data.get("recipientGroup", "")


    if notify_type not in ["system", "email"]:
        return jsonify({"success": False, "message": "notifyType повинен бути 'system' або 'email'"}), 400

    if not text:
        return jsonify({"success": False, "message": "Текст повідомлення порожній"}), 400

    recipient_ids = []
    conn = get_db_connection()
    cursor = conn.cursor()

    if recipient_group and recipient_group.startswith("@"):
        if recipient_group == "@all":
            cursor.execute("""
                SELECT global_id FROM global_users
                WHERE is_deleted=0 AND is_blocked=0
            """)
            recipient_ids = [row[0] for row in cursor.fetchall()]
        elif recipient_group == "@client":
            cursor.execute("""
                SELECT global_id FROM global_users
                WHERE role='client' AND is_deleted=0 AND is_blocked=0
            """)
            recipient_ids = [row[0] for row in cursor.fetchall()]
        elif recipient_group == "@org":
            cursor.execute("""
                SELECT global_id FROM global_users
                WHERE role='organization' AND is_deleted=0 AND is_blocked=0
            """)
            recipient_ids = [row[0] for row in cursor.fetchall()]
        elif recipient_group == "@admin":
            cursor.execute("""
                SELECT global_id FROM global_users
                WHERE role='admin' AND is_deleted=0 AND is_blocked=0
            """)
            recipient_ids = [row[0] for row in cursor.fetchall()]
    elif all_users:
        answers_folder = get_answers_folder(survey_id)
        answers_file = os.path.join(answers_folder, f"answer_{survey_id}.txt")
        if not os.path.exists(answers_file):
            return jsonify({"success": False, "message": "Немає відповідей, нема кому відправляти."}), 400

        user_ids_set = set()
        with open(answers_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                parts = line.split(";")
                if len(parts) < 2:
                    continue
                user_part = parts[1].strip()
                if user_part.startswith("user_id="):
                    uid = user_part.replace("user_id=", "").strip()
                    user_ids_set.add(uid)
        recipient_ids = list(user_ids_set)
    else:
        if not single_user_id:
            return jsonify({"success": False, "message": "Потрібно вказати userId, recipientGroup або all=true"}), 400
        recipient_ids = [single_user_id]

    if notify_type == "system":
        sender_id = getattr(g, "user_id", None)
        if not sender_id:
            sender_id = 9999
        cursor.execute("SELECT email FROM global_users WHERE global_id=?", (sender_id,))
        row = cursor.fetchone()
        sender_email = row[0] if row else "noreply@example.com"

        for rid in recipient_ids:
            subject = f"Повідомлення щодо опитування {survey_id}"
            cursor.execute("""
                INSERT INTO messages (sender_id, sender_email, recipient_id, subject, text, date)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            """, (sender_id, sender_email, rid, subject, text))
        conn.commit()

    else:
        for rid in recipient_ids:
            cursor.execute("SELECT role FROM global_users WHERE global_id=?", (rid,))
            role_row = cursor.fetchone()
            if role_row:
                owner_role = role_row[0]
                email_to = None
                if owner_role == "admin":
                    cursor.execute("SELECT email FROM admins WHERE id=? AND is_deleted=0 AND is_blocked=0", (rid,))
                    row2 = cursor.fetchone()
                    if row2:
                        email_to = row2[0]
                elif owner_role == "client":
                    cursor.execute("SELECT email FROM clients WHERE id=? AND is_deleted=0 AND is_blocked=0", (rid,))
                    row2 = cursor.fetchone()
                    if row2:
                        email_to = row2[0]
                elif owner_role == "organization":
                    cursor.execute("SELECT organization_email FROM organizations WHERE id=? AND is_deleted=0 AND is_blocked=0", (rid,))
                    row2 = cursor.fetchone()
                    if row2:
                        email_to = row2[0]

                if email_to:
                    try:
                        send_email(email_to, text)
                    except Exception as e:
                        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")
                        print("Помилка відправлення email:", e)

    conn.close()

    log_event(
        log_type="notification_send",
        user_id=g.user_id,
        description=f"Розсилка повідомлень з опитування {survey_id}, notify_type={notify_type}, all={all_users}, group={recipient_group}, single={single_user_id}"
    )

    return jsonify({"success": True, "message": "Повідомлення надіслані."})

def send_email(to_email, body_text):

    sender_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_server = "smtp.gmail.com"
    smtp_port = 587

    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = to_email
    msg["Subject"] = "Повідомлення з опитування"

    msg.attach(MIMEText(body_text, "plain"))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, smtp_password)
            server.sendmail(sender_email, to_email, msg.as_string())
    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        print("Помилка при надсиланні email:", e)

@app.route("/api/admin/surveys", methods=["GET"])
def admin_get_all_surveys():
    if g.user_role != "admin":
        return jsonify({"success": False, "message": "Доступ заборонено"}), 403

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT owner_id, survey_id, survey_name, creation_date, status
        FROM surveys
        ORDER BY creation_date DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    surveys = []
    for (owner_id, sid, sname, cdate, st) in rows:
        surveys.append({
            "owner_id": owner_id,
            "survey_id": sid,
            "survey_name": sname,
            "creation_date": cdate,
            "status": st
        })
    return jsonify({"success": True, "surveys": surveys})

@app.route("/api/admin/surveys/<string:survey_id>/delete-with-notification", methods=["POST"])
def admin_delete_survey_with_notification(survey_id):
    if g.user_role != "admin":
        return jsonify({"success": False, "message": "Доступ заборонено"}), 403

    data = request.json
    channel = data.get("channel")
    subject = data.get("subject")
    message = data.get("message")
    owner_id = data.get("owner_id")

    if not all([channel, subject, message, owner_id]):
        return jsonify({"success": False, "message": "Не всі поля заповнені"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT survey_id, survey_folder_link, answers_folder_link FROM surveys WHERE survey_id=?", (survey_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"success": False, "message": "Опитування не знайдено"}), 404

    db_survey_id, survey_folder, answers_folder = row

    created_by = g.user_id
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    recipients_str = str(owner_id)

    recipients_count = 1 if channel == "system" else 0
    cursor.execute("""
        INSERT INTO notifications
        (channel, recipients, subject, message, image_link, signature, created_by, created_at, recipients_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        channel,
        recipients_str,
        subject,
        message,
        "",
        "",
        created_by,
        created_at,
        recipients_count
    ))
    notif_id = cursor.lastrowid
    conn.commit()

    if channel == "email":
        cursor.execute("SELECT role FROM global_users WHERE global_id=? AND is_deleted=0 AND is_blocked=0", (owner_id,))
        role_row = cursor.fetchone()
        if role_row:
            owner_role = role_row[0]
            email_to = None
            if owner_role == "admin":
                cursor.execute("SELECT email FROM admins WHERE id=? AND is_deleted=0 AND is_blocked=0", (owner_id,))
                row2 = cursor.fetchone()
                if row2:
                    email_to = row2[0]
            elif owner_role == "client":
                cursor.execute("SELECT email FROM clients WHERE id=? AND is_deleted=0 AND is_blocked=0", (owner_id,))
                row2 = cursor.fetchone()
                if row2:
                    email_to = row2[0]
            elif owner_role == "organization":
                cursor.execute("SELECT organization_email FROM organizations WHERE id=? AND is_deleted=0 AND is_blocked=0", (owner_id,))
                row2 = cursor.fetchone()
                if row2:
                    email_to = row2[0]

            if email_to:
                try:
                    send_custom_email(to_email=email_to, subject=subject, body=message)
                except Exception as e:
                    log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

                    print("Помилка відправлення email:", e)

                cursor.execute("DELETE FROM surveys WHERE survey_id=?", (survey_id,))
                conn.commit()
                conn.close()

            try:
                if survey_folder and os.path.exists(survey_folder):
                    shutil.rmtree(survey_folder)
                if answers_folder and os.path.exists(answers_folder):
                    shutil.rmtree(answers_folder)
            except Exception as e:
                log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

                print("Помилка при видаленні папок:", e)
            log_event(
            log_type="survey_delete",
            user_id=g.user_id,
            project_id=None,
            description=f"Опитування {survey_id} видалено адміном {g.user_id}"
            )
    return jsonify({"success": True, "message": "Опитування видалено, повідомлення надіслано"})






@app.route("/api/notifications", methods=["POST"])
def create_notification():
    if g.user_role != "admin":
        return jsonify({"success": False, "message": "Доступ заборонено"}), 403

    data = request.json
    channel = data.get("channel")
    recipients_str = data.get("recipients")
    subject = data.get("subject")
    message = data.get("message")
    image_link = data.get("image_link", "")
    signature = data.get("signature", "")

    if not all([channel, recipients_str, subject, message]):
        return jsonify({"success": False, "message": "Не всі поля заповнені"}), 400

    created_by = g.user_id
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    recipients_count = 0
    to_addresses = []
    conn = get_db_connection()
    cursor = conn.cursor()

    if recipients_str in ["@all", "@client", "@org", "@admin"]:
        if recipients_str == "@all":
            cursor.execute("""
                SELECT global_id FROM global_users
                WHERE is_deleted=0 AND is_blocked=0
            """)
            if channel == 'email':
                cursor.execute("""
                    SELECT email FROM clients WHERE is_deleted=0 AND is_blocked=0
                    UNION
                    SELECT organization_email FROM organizations WHERE is_deleted=0 AND is_blocked=0
                    UNION
                    SELECT email FROM admins WHERE is_deleted=0 AND is_blocked=0
                """)
                to_addresses = [r[0] for r in cursor.fetchall() if r[0]]
        elif recipients_str == "@client":
            cursor.execute("""
                SELECT global_id FROM global_users
                WHERE role='client' AND is_deleted=0 AND is_blocked=0
            """)
            if channel == 'email':
                cursor.execute("""
                    SELECT email FROM clients WHERE is_deleted=0 AND is_blocked=0
                """)
                to_addresses = [r[0] for r in cursor.fetchall() if r[0]]
        elif recipients_str == "@org":
            cursor.execute("""
                SELECT global_id FROM global_users
                WHERE role='organization' AND is_deleted=0 AND is_blocked=0
            """)
            if channel == 'email':
                cursor.execute("""
                    SELECT organization_email FROM organizations WHERE is_deleted=0 AND is_blocked=0
                """)
                to_addresses = [r[0] for r in cursor.fetchall() if r[0]]
        elif recipients_str == "@admin":
            cursor.execute("""
                SELECT global_id FROM global_users
                WHERE role='admin' AND is_deleted=0 AND is_blocked=0
            """)
            if channel == 'email':
                cursor.execute("""
                    SELECT email FROM admins WHERE is_deleted=0 AND is_blocked=0
                """)
                to_addresses = [r[0] for r in cursor.fetchall() if r[0]]

        if channel == 'system':
            user_ids = [row[0] for row in cursor.fetchall()]
            recipients_count = len(user_ids)
    else:
        user_ids = []
        for part in recipients_str.split(","):
            user_id_str = part.strip()
            if user_id_str.isdigit():
                user_ids.append(int(user_id_str))
        user_ids = list(set(user_ids))

        count_valid = 0
        valid_user_ids = []
        for uid in user_ids:
            cursor.execute("""
                SELECT global_id FROM global_users WHERE global_id=? AND is_deleted=0 AND is_blocked=0
            """, (uid,))
            if cursor.fetchone():
                count_valid += 1
                valid_user_ids.append(uid)
        recipients_count = count_valid
        user_ids = valid_user_ids

        if channel == "email":
            for uid in user_ids:
                cursor.execute("SELECT role FROM global_users WHERE global_id=? AND is_deleted=0 AND is_blocked=0", (uid,))
                role_row = cursor.fetchone()
                if not role_row:
                    continue
                role = role_row[0]

                if role == "admin":
                    cursor.execute("SELECT email FROM admins WHERE id=? AND is_deleted=0 AND is_blocked=0", (uid,))
                elif role == "client":
                    cursor.execute("SELECT email FROM clients WHERE id=? AND is_deleted=0 AND is_blocked=0", (uid,))
                elif role == "organization":
                    cursor.execute("SELECT organization_email FROM organizations WHERE id=? AND is_deleted=0 AND is_blocked=0", (uid,))
                row = cursor.fetchone()
                if row and row[0]:
                    to_addresses.append(row[0])

    if channel == "email":
        for email_to in to_addresses:
            try:
                send_custom_email(
                    to_email=email_to,
                    subject=subject,
                    body=f"{message}\n\n{signature}\n",
                )
            except Exception as e:
                log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")
                print("Помилка відправки email на", email_to, ":", e)

        recipients_count = 0

    cursor.execute("""
        INSERT INTO notifications (channel, recipients, subject, message, image_link, signature, created_by, created_at, recipients_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (channel, recipients_str, subject, message, image_link, signature, created_by, created_at, recipients_count))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Сповіщення створено"})

def send_custom_email(to_email, subject, body):
    sender_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_server = "smtp.gmail.com"
    smtp_port = 587

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, smtp_password)
            server.sendmail(sender_email, to_email, msg.as_string())
        print(f"Email надіслано на {to_email}")
    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        print(f"Помилка при надсиланні листа на {to_email}: {e}")

@app.route("/api/notifications", methods=["GET"])
def get_notifications():
    user_id = g.user_id
    user_role = g.user_role

    conn = get_db_connection()
    cursor = conn.cursor()

    if user_role == "admin":
        cursor.execute("SELECT * FROM notifications ORDER BY created_at DESC")
        rows = cursor.fetchall()
    else:
        rows = []
        all_rows = cursor.execute("SELECT * FROM notifications WHERE channel='system' ORDER BY created_at DESC").fetchall()
        for r in all_rows:
            notif_id, channel, recipients_str, subj, msg, img, sign, created_by, created_at, rec_count, rd_count = r
            if recipients_str == "@all":
                rows.append(r)
            elif recipients_str == "@client" and user_role == "client":
                rows.append(r)
            elif recipients_str == "@org" and user_role == "organization":
                rows.append(r)
            elif recipients_str == "@admin" and user_role == "admin":
                rows.append(r)
            else:
                splitted = [x.strip() for x in recipients_str.split(",")]
                if str(user_id) in splitted:
                    rows.append(r)

    notifications_list = []
    for row in rows:
        (notif_id, channel, recipients_str, subj, msg, img_link, sign, cby, cat, rc_count, read_count) = row

        if channel == "system":
            cursor.execute("""
                SELECT COUNT(DISTINCT user_id)
                FROM notification_views
                WHERE notification_id=?
            """, (notif_id,))
            read_count_db = cursor.fetchone()[0]

            cursor.execute("""
                SELECT 1 FROM notification_views
                WHERE notification_id=? AND user_id=?
            """, (notif_id, user_id))
            was_viewed = cursor.fetchone() is not None
        else:
            read_count_db = 0
            was_viewed = True

        can_delete = (user_role == "admin" and channel == "system")

        notifications_list.append({
            "id": notif_id,
            "channel": channel,
            "subject": subj,
            "message": msg,
            "image_link": img_link,
            "signature": sign,
            "created_by": cby,
            "created_at": cat,
            "recipients_count": rc_count,
            "read_count": read_count_db,
            "can_delete": can_delete,
            "was_viewed": was_viewed
        })

    conn.close()
    return jsonify({"success": True, "notifications": notifications_list})

@app.route("/api/notifications/mark-as-viewed", methods=["POST"])
def mark_notification_viewed():

    data = request.json
    notification_id = data.get("notification_id")
    if not notification_id:
        return jsonify({"success": False, "message": "notification_id не указан"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT channel FROM notifications WHERE id=?", (notification_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"success": False, "message": "Сповіщення не знайдено"}), 404

    channel = row[0]
    if channel != "system":
        conn.close()
        return jsonify({"success": False, "message": "Це оповіщення не системне, відмітка про перегляд не потрібна"}), 400

    user_id = g.user_id
    viewed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        cursor.execute("""
            INSERT INTO notification_views (notification_id, user_id, viewed_at)
            VALUES (?, ?, ?)
        """, (notification_id, user_id, viewed_at))
        conn.commit()
    except sqlite3.IntegrityError:
        pass

    conn.close()
    return jsonify({"success": True, "message": "Перегляд оповіщення зафіксовано"})

@app.route("/api/notifications/<int:notification_id>", methods=["DELETE"])
def delete_notification(notification_id):
    if g.user_role != "admin":
        return jsonify({"success": False, "message": "Доступ заборонено"}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT channel FROM notifications WHERE id=?", (notification_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"success": False, "message": "Сповіщення не знайдено"}), 404

    channel = row[0]
    if channel != "system":
        conn.close()
        return jsonify({"success": False, "message": "Не можна видалити email-повідомлення"}), 400

    cursor.execute("DELETE FROM notifications WHERE id=?", (notification_id,))
    cursor.execute("DELETE FROM notification_views WHERE notification_id=?", (notification_id,))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Сповіщення видалено"})

@app.route("/api/notifications", methods=["DELETE"])
def delete_all_notifications():
    if g.user_role != "admin":
        return jsonify({"success": False, "message": "Доступ заборонено"}), 403

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notification_views WHERE notification_id IN (SELECT id FROM notifications WHERE channel='system')")
    cursor.execute("DELETE FROM notifications WHERE channel='system'")
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Усі системні оповіщення видалені"})

@app.route("/api/access_question_types", methods=["GET"])
def get_access_question_types():

    if not g.get("user_id"):
        return jsonify({"success": False, "message": "Користувач не автентифікований"}), 401

    user_id = g.user_id
    user_role = g.user_role
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if user_role == "admin":
            cursor.execute("SELECT vip FROM admins WHERE id=?", (user_id,))
        elif user_role == "client":
            cursor.execute("SELECT vip FROM clients WHERE id=?", (user_id,))
        elif user_role == "organization":
            cursor.execute("SELECT vip FROM organizations WHERE id=?", (user_id,))
        else:
            conn.close()
            return jsonify({"success": False, "message": "Невідома роль користувача"}), 403

        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"success": False, "message": "Користувача не знайдено в БД"}), 404

        user_vip = row[0]

        if user_vip == 1:
            all_types = [
                "101","102","103","104","105",
                "201","202",
                "301","302","303","304","305","306",
                "401","402","403","404","405",
                "501","502","503","504","505","506","507"
            ]
            conn.close()
            return jsonify({"success": True, "questionTypes": all_types})
        else:
            cursor.execute("SELECT questionTypes FROM tariffs WHERE vipNumber=?", (user_vip,))
            tariff_row = cursor.fetchone()
            if not tariff_row:
                conn.close()
                return jsonify({
                    "success": True,
                    "questionTypes": []
                })

            question_types_str = tariff_row[0]
            if not question_types_str:
                conn.close()
                return jsonify({
                    "success": True,
                    "questionTypes": []
                })

            question_types_list = [t.strip() for t in question_types_str.split(",") if t.strip()]

            conn.close()
            return jsonify({
                "success": True,
                "questionTypes": question_types_list
            })

    except Exception as e:
        log_event("error", g.user_id if g.user_id else None, None, f"Помилка: {str(e)}")

        conn.close()
        print("Помилка в get_access_question_types:", e)
        return jsonify({"success": False, "message": "Помилка на сервері"}), 500

@app.route("/api/home-data", methods=["GET"])
def get_home_data():
    user_id = g.user_id
    user_role = g.user_role

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*)
        FROM messages
        WHERE recipient_id = ?
          AND deleted = 0
          AND read = 0
    """, (user_id,))
    unread_messages = cursor.fetchone()[0]

    pending_verifications = 0
    if user_role == 'admin':
        cursor.execute("""
            SELECT COUNT(*)
            FROM organizations
            WHERE is_verified=0 OR is_verified=1
              AND is_deleted=0
              AND is_blocked=0
              AND authentication_by_admin=0
        """)
        pending_verifications = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM survey_invites si
        JOIN surveys s ON s.survey_id=si.survey_id
        WHERE si.user_id=?
          AND si.status IN ('invited','postponed')
          AND s.status IN ('активный','на паузе','отложен')
    """, (user_id,))
    invitations_count = cursor.fetchone()[0]

    cursor.execute("SELECT id, recipients FROM notifications WHERE channel='system'")
    all_system_notifs = cursor.fetchall()

    relevant_notif_ids = []
    for notif_id, recs in all_system_notifs:
        if recs == '@all':
            relevant_notif_ids.append(notif_id)
        elif recs == '@client' and user_role == 'client':
            relevant_notif_ids.append(notif_id)
        elif recs == '@org' and user_role == 'organization':
            relevant_notif_ids.append(notif_id)
        elif recs == '@admin' and user_role == 'admin':
            relevant_notif_ids.append(notif_id)
        else:
            splitted = [x.strip() for x in recs.split(',')]
            if str(user_id) in splitted:
                relevant_notif_ids.append(notif_id)

    unread_notifications = 0
    for nid in relevant_notif_ids:
        cursor.execute("""
            SELECT 1 FROM notification_views
             WHERE notification_id=?
               AND user_id=?
        """, (nid, user_id))
        viewed = cursor.fetchone()
        if not viewed:
            unread_notifications += 1

    conn.close()

    return jsonify({
        "success": True,
        "unreadMessages": unread_messages,
        "pendingVerifications": pending_verifications,
        "surveyInvitationsCount": invitations_count,
        "unreadNotifications": unread_notifications
    })






@app.route("/api/logs/filter", methods=["POST"])
def filter_logs():

    if g.user_role != "admin":
        return jsonify({"success": False, "message": "Доступ заборонено."}), 403

    data = request.get_json()
    if not data:
        return jsonify({"success": False, "message": "Немає даних"}), 400

    log_types = data.get("logTypes", [])
    date_from = data.get("dateFrom")
    date_to = data.get("dateTo")
    user_id = data.get("userId")
    project_id = data.get("projectId")

    where_clauses = []
    params = []

    if log_types:
        placeholders = ",".join(["?"] * len(log_types))
        where_clauses.append(f"log_type IN ({placeholders})")
        params.extend(log_types)

    if date_from:
        where_clauses.append("log_date >= ?")
        params.append(date_from + " 00:00:00")
    if date_to:
        where_clauses.append("log_date <= ?")
        params.append(date_to + " 23:59:59")

    if user_id:
        where_clauses.append("user_id = ?")
        params.append(user_id)

    if project_id:
        where_clauses.append("project_id = ?")
        params.append(project_id)

    where_str = ""
    if where_clauses:
        where_str = "WHERE " + " AND ".join(where_clauses)

    query = f"""
        SELECT log_id, log_type, user_id, project_id, log_date, description
        FROM system_logs
        {where_str}
        ORDER BY log_date DESC
        LIMIT 5000
    """

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()

    logs_list = []
    for row in rows:
        logs_list.append({
            "log_id": row[0],
            "log_type": row[1],
            "user_id": row[2],
            "project_id": row[3],
            "log_date": row[4],
            "description": row[5]
        })

    return jsonify({"success": True, "logs": logs_list})

@app.route("/api/logs/download", methods=["GET"])
def download_logs_txt():
    
    if g.user_role != "admin":
        return jsonify({"success": False, "message": "Доступ заборонено (только админ)."}), 403

    log_types_str = request.args.get("logTypes", "")
    date_from = request.args.get("dateFrom")
    date_to = request.args.get("dateTo")
    user_id = request.args.get("userId")
    project_id = request.args.get("projectId")

    log_types = []
    if log_types_str:
        log_types = [x.strip() for x in log_types_str.split(",") if x.strip()]

    where_clauses = []
    params = []

    if log_types:
        placeholders = ",".join(["?"] * len(log_types))
        where_clauses.append(f"log_type IN ({placeholders})")
        params.extend(log_types)

    if date_from:
        where_clauses.append("log_date >= ?")
        params.append(date_from + " 00:00:00")
    if date_to:
        where_clauses.append("log_date <= ?")
        params.append(date_to + " 23:59:59")

    if user_id:
        where_clauses.append("user_id = ?")
        params.append(user_id)

    if project_id:
        where_clauses.append("project_id = ?")
        params.append(project_id)

    where_str = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    query = f"""
        SELECT log_id, log_type, user_id, project_id, log_date, description
        FROM system_logs
        {where_str}
        ORDER BY log_date DESC
        LIMIT 5000
    """

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()

    lines = ["LOG_ID | LOG_DATE | LOG_TYPE | USER_ID | PROJECT_ID | DESCRIPTION"]
    for row in rows:
        line = f"{row[0]} | {row[4]} | {row[1]} | {row[2] or ''} | {row[3] or ''} | {row[5] or ''}"
        lines.append(line)

    file_content = "\n".join(lines)

    return Response(
        file_content,
        mimetype="text/plain",
        headers={"Content-Disposition": "attachment; filename=logs.txt"}
    )

def log_event(log_type, user_id=None, project_id=None, description=""):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO system_logs (log_type, user_id, project_id, log_date, description)
            VALUES (?, ?, ?, ?, ?)
        """, (log_type, user_id, project_id, now_str, description))
        conn.commit()
    except Exception as ex:

        print(f"Помилка запису лога: {ex}")
    finally:
        conn.close()







@app.route("/api/news", methods=["GET"])
def get_news():
    if not g.user_id:
        return jsonify({"success": False, "message": "Необхідна авторизація"}), 401

    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
    SELECT id, title, content, source, source_url, published_at, created_by
    FROM news
    ORDER BY published_at DESC
    """)

    news_rows = cursor.fetchall()
    news_list = []

    for row in news_rows:
        news_list.append({
            "id": row["id"],
            "title": row["title"],
            "content": row["content"],
            "source": row["source"],
            "source_url": row["source_url"],
            "published_at": row["published_at"],
            "created_by": row["created_by"]
        })

    conn.close()

    return jsonify({"success": True, "news": news_list})

@app.route("/api/news", methods=["POST"])
def add_news():
    if not g.user_id:
        return jsonify({"success": False, "message": "Необхідна авторизація"}), 401

    if g.user_role != "admin":
        return jsonify({"success": False, "message": "Доступ заборонено"}), 403

    data = request.json

    if not data or "title" not in data or "content" not in data:
        return jsonify({"success": False, "message": "Відсутні обов'язкові поля"}), 400

    title = data.get("title")
    content = data.get("content")
    source = data.get("source", "admin")
    source_url = data.get("source_url", "")

    published_at = datetime.now().isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO news (title, content, source, source_url, published_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (title, content, source, source_url, published_at, g.user_id))

    conn.commit()
    news_id = cursor.lastrowid
    conn.close()

    return jsonify({
        "success": True,
        "message": "Новину додано",
        "news_id": news_id
    })

@app.route("/api/news/<int:news_id>", methods=["DELETE"])
def delete_news(news_id):
    if not g.user_id:
        return jsonify({"success": False, "message": "Необхідна авторизація"}), 401

    if g.user_role != "admin":
        return jsonify({"success": False, "message": "Доступ заборонено"}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM news WHERE id=?", (news_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"success": False, "message": "Новина не знайдена"}), 404

    cursor.execute("DELETE FROM news WHERE id=?", (news_id,))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Новину видалено"
    })

@app.route("/api/news/fetch", methods=["POST"])
def fetch_external_news():
    if not g.user_id:
        return jsonify({"success": False, "message": "Необхідна авторизація"}), 401

    if g.user_role != "admin":
        return jsonify({"success": False, "message": "Доступ заборонено"}), 403

    data = request.json
    source = data.get("source")
    pages = data.get("pages", 1)

    if not source or source not in ["pravda", "ukrinform", "suspilne"]:
        return jsonify({"success": False, "message": "Некоректне джерело"}), 400

    try:
        if source == "pravda":
            news_items = fetch_pravda_news(pages)
        elif source == "ukrinform":
            news_items = fetch_ukrinform_news()
        elif source == "suspilne":
            news_items = fetch_suspilne_news(pages)

        conn = get_db_connection()
        cursor = conn.cursor()

        added_count = 0
        for news in news_items:
            cursor.execute("""
            SELECT id FROM news
            WHERE title=? AND source=?
            """, (news["title"], news["source"]))

            if cursor.fetchone():
                continue

            cursor.execute("""
            INSERT INTO news (title, content, source, source_url, published_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (
                news["title"],
                news["content"],
                news["source"],
                news["source_url"],
                news["published_at"],
                g.user_id
            ))
            added_count += 1

        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "message": f"Успішно додано {added_count} новин",
            "count": added_count
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Помилка при отриманні новин: {str(e)}"
        }), 500
    
def fetch_pravda_news(max_pages=2):
    news_items = []
    base_url = "https://www.pravda.com.ua/tags/opituvannja"

    for page in range(1, min(max_pages + 1, 3)):
        try:
            if page == 1:
                url = base_url
            else:
                url = f"{base_url}/page_{page}/"

            print(f"Парсинг сторінки: {url}")
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=15)

            if response.status_code != 200:
                print(f"Помилка завантаження сторінки, статус коду: {response.status_code}")
                break

            soup = BeautifulSoup(response.content, "html.parser")
            article_elements = soup.select("div.article.article_list")

            print(f"Знайдено статті на сторінці: {len(article_elements)}")

            if not article_elements:
                print("Статті не знайдено, перевіряємо альтернативну структуру...")
                article_elements = soup.select(".article_news")
                if not article_elements:
                    print("Альтернативну структуру не знайдено. Припиняємо парсинг.")
                    break

            for article in article_elements:
                try:
                    title_element = article.select_one("h3 a") or article.select_one(".article_header a")
                    if not title_element:
                        print("Заголовок статті не знайдено, пропускаємо")
                        continue

                    title = title_element.text.strip()
                    url_path = title_element["href"]
                    source_url = f"https://www.pravda.com.ua{url_path}" if url_path.startswith("/") else url_path

                    print(f"Обробляємо статтю: {title[:50]}...")

                    date_element = article.select_one(".article_author") or article.select_one(".article__time")
                    date_text = date_element.text.strip() if date_element else ""

                    date_match = re.search(r"(\d+\s+\w+\s+\d{4})", date_text)
                    if date_match:
                        date_str = date_match.group(1)
                        try:
                            months_dict = {
                                "січня": "01", "лютого": "02", "березня": "03", "квітня": "04",
                                "травня": "05", "червня": "06", "липня": "07", "серпня": "08",
                                "вересня": "09", "жовтня": "10", "листопада": "11", "грудня": "12"
                            }

                            day, month_name, year = date_str.split()
                            month = months_dict.get(month_name.lower(), "01")
                            published_at = f"{year}-{month}-{day.zfill(2)}T00:00:00"
                        except Exception as e:
                            print(f"Помилка при обробці дати: {str(e)}")
                            published_at = datetime.now().isoformat()
                    else:
                        print(f"Формат дати не розпізнаний: {date_text}")
                        published_at = datetime.now().isoformat()

                    try:
                        print(f"Завантажуємо контент за посиланням: {source_url}")
                        news_response = requests.get(source_url, headers=headers, timeout=15)

                        if news_response.status_code == 200:
                            news_soup = BeautifulSoup(news_response.content, "html.parser")

                            content_element = (
                                news_soup.select_one("div.post_text") or
                                news_soup.select_one("div.post__text") or
                                news_soup.select_one("article.post")
                            )

                            if content_element:
                                paragraphs = content_element.select("p")
                                if paragraphs:
                                    content = " ".join([p.text.strip() for p in paragraphs[:3]])
                                else:
                                    content = content_element.get_text(strip=True)[:500] + "..."
                            else:
                                print("Неможливо знайти контент на сторінці")
                                content = "Немає доступного змісту."
                        else:
                            print(f"Помилка завантаження змісту, статус код: {news_response.status_code}")
                            content = "Неможливо завантажити вміст новини."
                    except Exception as e:
                        print(f"Помилка під час завантаження вмісту: {str(e)}")
                        content = "Неможливо завантажити вміст новини."

                    news_items.append({
                        "title": title,
                        "content": content,
                        "source": "Українська Правда",
                        "source_url": source_url,
                        "published_at": published_at
                    })

                    print(f"Успішно додано новину:'{title[:30]}...'")

                except Exception as e:
                    print(f"Помилка при обробці статті: {str(e)}")
                    continue

            print(f"Оброблено {len(news_items)} новин після сторінки {page}")

        except Exception as e:
            print(f"Помилка при завантаженні сторінки {page}: {str(e)}")
            break

    print(f"Усього зібрано новин: {len(news_items)}")
    return news_items

def fetch_ukrinform_news():
    news_items = []
    url = "https://www.ukrinform.ua/tag-opituvanna"

    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            return news_items

        soup = BeautifulSoup(response.content, "html.parser")
        article_elements = soup.select("article")

        for article in article_elements:
            try:
                title_element = article.select_one("h2 a")
                if not title_element:
                    continue

                title = title_element.text.strip()
                source_url = title_element["href"]
                if not source_url.startswith("http"):
                    source_url = f"https://www.ukrinform.ua{source_url}"

                time_element = article.select_one("time")
                published_at = time_element.get("datetime", "") if time_element else datetime.now().isoformat()

                content_element = article.select_one("p")
                content = content_element.text.strip() if content_element else "Нема доступного змісту."

                image_element = article.select_one("img")
                image_url = ""
                if image_element and "src" in image_element.attrs:
                    image_url = image_element["src"]
                    if image_url:
                        content = f"{content}\n\nЗображення: {image_url}"

                news_items.append({
                    "title": title,
                    "content": content,
                    "source": "УкрІнформ",
                    "source_url": source_url,
                    "published_at": published_at
                })

            except Exception as e:
                print(f"Помилка при обробці статті: {str(e)}")
                continue

    except Exception as e:
        print(f"Помилка під час завантаження новин УкрІнформ: {str(e)}")

    return news_items

def fetch_suspilne_news(max_pages=10):
    news_items = []
    base_url = "https://suspilne.media/tag/opituvanna"

    for page in range(1, max_pages + 1):
        try:
            if page == 1:
                url = base_url
            else:
                url = f"{base_url}/?page={page}"

            response = requests.get(url, timeout=10)
            if response.status_code != 200:
                break

            soup = BeautifulSoup(response.content, "html.parser")
            article_elements = soup.select("article.c-article-card")

            if not article_elements:
                break

            for article in article_elements:
                try:
                    headline_element = article.select_one(".c-article-card__headline-inner")
                    if not headline_element:
                        continue

                    title = headline_element.text.strip()

                    link_element = article.select_one("a.c-article-card__headline")
                    if not link_element:
                        continue

                    source_url = link_element["href"]

                    desc_element = article.select_one(".c-article-card__desc")
                    content = desc_element.text.strip() if desc_element else "Немає доступного опису."

                    time_element = article.select_one("time.c-article-card__info__time")
                    if time_element and time_element.has_attr("datetime"):
                        published_at = time_element["datetime"]
                    else:
                        date_text = time_element.text.strip() if time_element else ""
                        try:
                            day, month_and_time = date_text.split()
                            month, time = month_and_time.split(',')

                            months_dict = {
                                "січня": "01", "лютого": "02", "березня": "03", "квітня": "04",
                                "травня": "05", "червня": "06", "липня": "07", "серпня": "08",
                                "вересня": "09", "жовтня": "10", "листопада": "11", "грудня": "12"
                            }

                            month_num = months_dict.get(month.lower(), "01")
                            year = datetime.now().year
                            hour, minute = time.strip().split(':')

                            published_at = f"{year}-{month_num}-{day.zfill(2)}T{hour.zfill(2)}:{minute.zfill(2)}:00"
                        except:
                            published_at = datetime.now().isoformat()

                    image_element = article.select_one("img.c-article-card__image")
                    image_url = ""
                    if image_element and image_element.has_attr("src"):
                        image_url = image_element["src"]
                        if image_url:
                            content = f"{content}\n\nЗображення: {image_url}"

                    news_items.append({
                        "title": title,
                        "content": content,
                        "source": "Суспільне Новини",
                        "source_url": source_url,
                        "published_at": published_at
                    })
                except Exception as e:
                    print(f"Помилка при обробці статті Суспільне: {str(e)}")
                    continue

        except Exception as e:
            print(f"Помилка при завантаженні сторінки {page} Суспільне: {str(e)}")
            break

    return news_items

if __name__ == '__main__':
    create_tables()
    create_global_view_with_all_fields()
    app.run(debug=True, port=5000)
