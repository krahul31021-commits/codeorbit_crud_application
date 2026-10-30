# OrbitVault - Secure Authentication & Personal Vault Web App

OrbitVault is a complete full-stack web application featuring **User Registration (Sign Up)**, **User Login**, **Password Encryption (Bcrypt)**, **Stateless Token Authentication (JWT)**, and a **Confidential Personal Vault / Task Manager**.

---

## 🌟 1. Kaun Sa Web App Banaya Hai? (What is this app?)

Hamne **OrbitVault** banaya hai — jo ek **Confidential Personal Vault & Secret Task Manager** web application hai. 
Isme har user ka apna isolated space hota hai jahan wo apne sensitive credentials, confidential notes, aur private tasks ko safely store kar sakta hai.

---

## ⚙️ 2. Kya Kaam Aur Kaise Kaam Karta Hai? (Features & Working Mechanism)

### A. Authentication Flow (Signup & Login)
1. **Signup (Account Creation)**:
   - User apna Name, Email, aur Password daalta hai.
   - Frontend par live **Password Strength Meter** chalta hai.
   - Backend par input validate hota hai aur duplicate email check hoti hai.
   - Password ko seedha plain text me kabhi store nahi karte; ise **`bcryptjs`** ke zariye 10 salt rounds ke saath securely hash karke `data/users.json` me save kiya jata hai.
   - Account bante hi user ko ek **JWT (JSON Web Token)** issue hota hai aur user auto-login ho jata hai.

2. **Login (Session Generation)**:
   - User apna Email aur Password daalta hai.
   - Backend database me user ko dhundhta hai aur `bcrypt.compare()` se password verify karta hai.
   - Sahi credentials milne par server ek cryptographically signed JWT token generate karta hai (expiry: 24 hours).

3. **Session & Security (HttpOnly Cookies)**:
   - Session ID / JWT token ko screen ya client-side JavaScript me expose **nahi** kiya jata.
   - Server session ko **`HttpOnly` + `SameSite=Strict` Cookie** ke zariye silently manage karta hai.
   - Isse XSS attacks se token chori hone ka khatra khatam ho jata hai aur screen par kisi ko bhi session ID dikhta nahi hai.
   - Har private request (jaise notes add karna, delete karna, ya profile fetch karna) ke sath browser background me cookie automatically attach karta hai.
   - Backend ka [middleware/auth.js](file:///c:/Users/niraj/Desktop/codeorbit/User_Aunthentication/middleware/auth.js) is cookie ko securely verify karta hai.

4. **Secure Logout**:
   - Logout button dabane par server `res.clearCookie('token')` se cookie expire kar deta hai aur user wapas Public sign-in mode me aa jata hai.

### B. E2E Encrypted Media & File Vault (Photos, Videos, Docs)
- **Zero Raw File Exposure (On-The-Fly Encryption)**: Jab aap koi bhi photo, video, document, ya file upload karte hain, toh disk par raw file kabhi nahi banti. Server memory me hi use **AES-256-CBC** aur unique IV ke saath encrypt karta hai aur disk par sirf scrambled ciphertext (`.enc`) save hota hai.
- **Strict Privacy & User Isolation**: Har file metadata me user ka ID attach hota hai. Dusra koi bhi user na toh aapki files list dekh sakta hai aur na hi download/view kar sakta hai (unauthorized attempt par seedha `403 Forbidden` milta hai).
- **In-App Encrypted Viewer Modal**:
  - **Photos**: High-res responsive lightbox me decrypt hoke view hoti hain.
  - **Videos**: Built-in HTML5 secure video player me on-the-fly stream hoti hain.
  - **Documents/PDFs**: Embedded in-app viewer me render hote hain.
- **Permanent Erase**: Delete karne par ciphertext binary aur metadata permanent erase ho jate hain.

### C. Personal Vault & Task Features
- **Add Secret Notes/Tasks**: Title, confidential details, aur categories (Credentials, Work, Personal, Ideas, Urgent) select karke save karein.
- **Data Isolation**: Ek user ke notes dusra user access nahi kar sakta (backend user ID filter enforce karta hai).
- **Interactive Checkpoints**: Tasks ko "Mark Done" / "Completed" toggle karein.
- **Search & Filters**: Real-time vault search aur status-based filters (All / Pending / Completed).
- **Persistent JSON Storage**: Saara data `data/users.json`, `data/notes.json`, aur `data/files.json` me safely persistent rehta hai.

---

## 🚀 3. Kaise Run Karein? (How to Run Locally)

```bash
# 1. Dependencies install karein
npm install

# 2. Server start karein
npm start
# Ya
node server.js
```

Ab browser me open karein:
👉 **`http://localhost:5000`**

---

## 🧪 4. Automated End-to-End Test Suite

Hamne 14 complete end-to-end unit aur integration test cases likhe hain jo authentication flow, security edge cases, aur CRUD operations ko test karte hain:

```bash
npm test
```

### Test Coverage Highlights:
- ✅ **Email & Password Validation** (Rejects invalid emails & short passwords)
- ✅ **Bcrypt Hashing Verification** (Ensures hashed strings start with `$2`)
- ✅ **Duplicate Email Conflict** (HTTP 409)
- ✅ **Invalid Password Rejection** (HTTP 401)
- ✅ **Correct Password Login & Token Issuance** (HTTP 200)
- ✅ **Route Protection Without Token** (HTTP 401)
- ✅ **Forged Token Detection & Rejection** (HTTP 403)
- ✅ **Notes CRUD Operations** (Create, Read, Toggle, Delete)

---

## 📁 Project Structure

```
User_Aunthentication/
├── data/
│   ├── users.json          # Encrypted user accounts
│   └── notes.json          # User vault notes
├── db/
│   └── fileDb.js           # JSON file database helper
├── middleware/
│   └── auth.js             # JWT Bearer token authentication middleware
├── routes/
│   ├── auth.js             # /api/auth (signup, login, me)
│   └── notes.js            # /api/notes (protected vault operations)
├── public/
│   ├── index.html          # Modern responsive interface
│   ├── css/
│   │   └── style.css       # Glassmorphism dark-mode styles
│   └── js/
│       └── app.js          # Client-side auth, token management & dashboard
├── test/
│   └── flow.test.js        # Automated E2E test suite (14 test cases)
├── server.js               # Express application entry point
└── package.json            # Scripts & project dependencies
```
