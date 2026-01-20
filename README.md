# BizBot Automation Agency

**Final Year Project (FYP)**

---

##  Project Title

**BizBot Automation Agency: AI-Powered Business Process Automation for Small and Medium Enterprises**

---

##  Project Type

Final Year Project (FYP)

---

##  Academic Context

This project is submitted in partial fulfillment of the requirements for the **Bachelor of Science in Computer Science (BSCS)** degree.

---
## Problem Statement

Small and medium-sized businesses (SMEs) often face challenges in managing customer support, social media, and repetitive administrative tasks due to limited human resources. Manual handling of these tasks is time-consuming, prone to errors, and reduces operational efficiency. BizBot Automation Agency addresses these problems by providing AI-powered automation to streamline business processes, reduce workload, and improve customer engagement, making it ready for real-world deployment.

---  

##  Objectives

### Primary Objectives

* Automate customer communication using AI-powered WhatsApp chatbots
* Reduce manual workload in social media management and business operations
* Provide scalable and cost-efficient automation for SMEs

### Technical Objectives

* Implement Retrieval-Augmented Generation (RAG) for accurate AI responses
* Integrate OpenAI GPT-4 and Whisper for text and voice-based interactions
* Design modular automation workflows using n8n

---

##  Scope of the Project

* Target Audience: Small to Medium Businesses (10–100 employees)
* Supported Languages: English and Urdu
* Supported Platforms: WhatsApp, Instagram, LinkedIn
* Deployment Model: Self-hosted cloud infrastructure

---

##  Key Features

### WhatsApp AI Customer Support

* 24/7 automated responses
* Voice message transcription
* Business knowledge base integration
* Human agent escalation

### Social Media Automation

* AI-generated content and hashtags
* Post scheduling and publishing
* Engagement and performance analytics

### Workflow Automation

* Lead management
* Customer onboarding
* CRM synchronization

---

##  System Architecture

| Layer               | Description                     |
| ------------------- | ------------------------------- |
| Automation Layer    | n8n workflows                   |
| AI Layer            | GPT-4, Whisper, RAG             |
| Communication Layer | WhatsApp API, Social Media APIs |
| Data Layer          | PostgreSQL, Vector Database     |
| Security Layer      | SSL, Secure API Management      |

---

##  Tools & Technologies

* **Automation:** n8n
* **AI Models:** OpenAI GPT-4, Whisper
* **Databases:** PostgreSQL, Vector Database
* **APIs:** WhatsApp Business API, Instagram, LinkedIn
* **Cloud Hosting:** AWS / Hostinger
* **Security:** SSL, privacy-by-design

---

##  Methodology

The project follows an **Agile development approach**, consisting of:

1. Requirement gathering
2. Workflow design
3. AI integration using RAG
4. API and system integration
5. Testing and optimization
6. Deployment and monitoring

---

##  Success Criteria

* AI response accuracy ≥ 90%
* Manual workload reduction ≥ 80%
* Stakeholder satisfaction score > 4/5

---

##  Project Timeline

| Phase            | Duration        |
| ---------------- | --------------- |
| Foundation & MVP | Weeks 1–4       |
| AI Integration   | Weeks 5–8       |
| Pilot Testing    | Weeks 9–10      |
| Deployment       | Week 11 onwards |

---


## Installation Steps

1. **Clone the repository**

```bash
git clone https://github.com/<your-username>/bizbot.git
cd bizbot
```

2. **Setup backend (FastAPI + Python)**

   a. Create and activate a Python virtual environment:

```bash
python -m venv venv
# Linux / macOS
source venv/bin/activate
# Windows
venv\Scripts\activate
```

b. Install backend dependencies:

```bash
pip install -r requirements.txt
```

c. Set environment variables for secrets and API keys:

```bash
export DATABASE_URL="postgresql+asyncpg://<user>:<password>@<host>:5432/bizzbot"
export SECRET_KEY="<your-secret-key>"
export GOOGLE_CLIENT_ID="<your-google-client-id>"
```

*(Use `.env` file in production or local development for convenience.)*

3. **Setup frontend (React + TypeScript + Tailwind CSS)**

   a. Navigate to frontend folder:

```bash
cd frontend
```

b. Install dependencies:

```bash
npm install
```

---

## How to Run the Project

1. **Start backend server**

```bash
# From the project root
uvicorn main:app --reload
```

* API docs will be available at: `http://127.0.0.1:8000/docs`

2. **Start frontend development server**

```bash
cd frontend
npm run dev
```

* Frontend will be available at: `http://localhost:5173` (or as shown in terminal)

3. **Optional: Start automation workflows (n8n)**

* Ensure n8n workflows are running for scheduled automation tasks.

---


##  Conclusion

BizBot Automation Agency demonstrates how AI-driven automation can be effectively applied to real-world business challenges. By integrating intelligent customer support, automated content creation, and workflow automation, the project delivers measurable efficiency gains and provides a scalable solution for modern SMEs.

---
