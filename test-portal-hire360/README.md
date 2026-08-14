# Online Assessment Portal — MVP

## Project Structure

```
idp/
├── backend/
│   ├── app.py
│   ├── routes/candidate.py
│   ├── models/candidate.py
│   ├── services/candidate_service.py
│   ├── database/
│   │   ├── dynamodb.py
│   │   ├── create_tables.py
│   │   └── load_questions.py
│   ├── data/questions.json
│   ├── .env
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/
        │   ├── Login/
        │   ├── Instructions/
        │   ├── Test/
        │   ├── Review/
        │   └── ThankYou/
        ├── services/api.js
        └── App.js
```

---

## Tech Stack

| Layer     | Technology              |
|-----------|-------------------------|
| Frontend  | React.js + Tailwind CSS |
| Backend   | Python + FastAPI        |
| Database  | AWS DynamoDB            |
| AWS Auth  | AWS SSO                 |

---

## Company Laptop Setup (First Time)

### Step 1 — Prerequisites

Make sure these are installed on your company laptop:

- Python 3.8+
- Node.js 16+
- npm
- AWS CLI v2

Check by running:
```bash
python --version
node --version
npm --version
aws --version
```

---

### Step 2 — Copy Project

Copy the entire `idp` folder to your company laptop.

Or zip it here and extract there:
```
Right click idp folder → Send to → Compressed (zipped) folder
```

---

### Step 3 — AWS SSO Login

```bash
aws sso login --profile idp-sbx-trn-lab-01
```

This opens browser → login with your company credentials → come back to terminal.

---

### Step 4 — Update .env File

Open `backend/.env` and make sure it looks like this:

```
AWS_REGION=ap-southeast-1
AWS_PROFILE=idp-sbx-trn-lab-01
USERS_TABLE=candidate_table
ANSWERS_TABLE=answer_table
QUESTIONS_TABLE=question_table
```

No changes needed if profile name is same.

---

### Step 5 — Backend Setup

Open Terminal 1:

```bash
cd idp/backend

# Install dependencies
pip install -r requirements.txt

# Create DynamoDB tables (run only once)
python database/create_tables.py

# Load questions into DynamoDB (run only once)
python database/load_questions.py

# Start backend server
uvicorn app:app --reload
```

Backend runs at → http://localhost:8000

---

### Step 6 — Frontend Setup

Open Terminal 2:

```bash
cd idp/frontend

# Install dependencies
npm install

# Start frontend
npm start
```

Frontend runs at → http://localhost:3000

---

### Step 7 — Open App

Open browser and go to:
```
http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint     | Description              |
|--------|-------------|--------------------------|
| POST   | /register   | Register candidate        |
| GET    | /questions  | Fetch all questions       |
| POST   | /submit     | Submit candidate answers  |

---

## DynamoDB Tables

| Table           | Partition Key | Description          |
|-----------------|---------------|----------------------|
| candidate_table | email         | Stores candidate info |
| answer_table    | email         | Stores answers        |
| question_table  | questionId    | Stores MCQ questions  |

---

## Candidate Flow

```
Login Page → Instructions Page → Test Page → Review Page → Thank You Page
```

---

## Important Notes

- Run `create_tables.py` only ONCE (first time setup)
- Run `load_questions.py` only ONCE (first time setup)
- Always run `aws sso login` before starting backend
- Keep both terminals running while using the app
- Do NOT zip node_modules or venv folders

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| AWS credentials error | Run `aws sso login --profile idp-sbx-trn-lab-01` |
| Table already exists | Safe to ignore ⚠️ message |
| CORS error in browser | Make sure backend is running on port 8000 |
| npm start fails | Run `npm install` first |
| Questions not loading | Run `load_questions.py` first |
