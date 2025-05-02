# 🦉 OwlView — Survey Platform with Blockchain & AI
Secure platform for social surveys: integration of encryption and access control technologies to ensure data privacy
A full-featured web application for secure and flexible survey creation, response tracking, and user management, built using **Flask (Python)** for backend and **React + Vite** for frontend.

This is a **course project** created by **Nachynka Anastasiia**, a 3rd-year student at the **Faculty of Applied Mathematics and Informatics**, majoring in **Cybersecurity**, at **Ivan Franko National University of Lviv**.

---

## ✨ Features

### 🔐 Authentication & Security
- Google OAuth login
- Token-based authentication
- Rate limiting (`Flask-Limiter`)
- Input sanitization (`bleach`)
- Encrypted password storage (`bcrypt`, salted)
- CSRF-safe design
- `Content-Security-Policy` enforced in frontend (Vite)

### 🗃️ User Roles
- `Client`, `Admin`, and `Organization` roles
- Separate survey folders and access control by role
- Profile management and role-based dashboards

### 🧾 Surveys
- Create & edit encrypted surveys with custom questions
- Password protection & invited respondents
- Blockchain-based logging for survey creation and responses

### ⛓️ Blockchain Integration
- Custom proof-of-work algorithm
- Survey creation and responses are added to an immutable chain
- Validation and audit support for survey integrity

### 🤖 AI Integration
- Google Generative AI integration to process user prompts
- Example: Generate survey questions based on user input

### 📩 Messaging System
- User-to-user and support messaging
- Reply, delete, postpone, and status updates
- Admin broadcast to all users

### 📊 Statistics & Admin Tools
- Platform stats (user count, surveys, responses)
- User blocking/unblocking
- Admin assignment/removal
- Tariff management
- Withdrawals & recharge requests handling

---

## 📁 Tech Stack

### Backend (Python / Flask)
- Flask + Flask-CORS
- SQLite + SQLCipher for encrypted DB
- bcrypt + Fernet for security
- Google Generative AI
- Email verification via SMTP

### Frontend (React + Vite)
- React Router, Axios
- Vite dev server with custom middleware for CSP headers
- Role-based UI
- Token storage in headers

---

## 🛡️ Security Features

- ✅ Input sanitization (`bleach`)  
- ✅ Password hashing with salt (`bcrypt`)  
- ✅ Token expiry and session control  
- ✅ Rate limiting via IP  
- ✅ Secure headers (`CSP`, `Referrer-Policy`, `X-Frame-Options`)  
- ✅ Verification codes for registration  
- ✅ Role-based access to endpoints  
- ✅ Blockchain for immutable record logging  

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/your-username/owlview-service.git
cd owlview-service
```

### 2. Backend Setup (Python)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env  # Fill in your keys and DB details
python app.py  # or flask run
```

### 3. Frontend Setup (React + Vite)
```bash
cd front
npm install
npm run dev
```

### 📚 .env Configuration
Set up `.env` in the backend with the following variables:
```bash
DB_NAME=main.db
DB_ENCRYPTION_KEY=...
ENCRYPTION_KEY=...
SALT=...
GOOGLE_API_KEY=...
AI_MODEL=gemini-pro
BASE_CLIENT_SURVEY=...
BASE_ADMIN_SURVEY=...
BASE_ORG_SURVEY=...
BASE_ORG_DOCUMENTS=...
TOKEN_EXPIRY_DAYS=3
SMTP_EMAIL=your@email.com
SMTP_PASSWORD=your-password
```
---

### 📄 License
This project is for educational purposes and was created as a course project by **Nachynka Anastasiia**.
**All rights reserved © 2025.**

