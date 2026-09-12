# IBVAP Startup Guide

This document outlines the procedures to start the various components of the IBVAP platform locally for development.

## Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Docker & Docker Compose (for Redis, Minio, and Hyperledger Fabric)
- PostgreSQL (or via Docker)

## 1. Starting the Backend
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Copy the environment file: `cp .env.example .env` and update the variables (Database URL, Redis, Minio credentials, etc.).
4. Start infrastructure dependencies (Redis, Database) if using Docker.
5. Generate Prisma client and migrate database:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```
6. Start the development server: `npm run dev`

## 2. Starting the Frontend
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Copy the environment file: `cp .env.local.example .env.local`
4. Start the development server: `npm run dev`
5. Access the application at `http://localhost:3000`

## 3. Starting the ML Service
1. Navigate to the ML directory: `cd ml`
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```
3. Install dependencies: `pip install -r requirements.txt`
4. Start the ML API server (typically via Uvicorn/FastAPI).

## 4. Hyperledger Fabric Network (Chaincode)
1. Navigate to the chaincode directory: `cd chaincode/ibvap-evidence-chaincode`
2. Ensure you have a local Fabric test network running.
3. Deploy the chaincode following standard Fabric deployment scripts.

npm run prisma:seed