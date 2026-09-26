# IBVAP Implementation Details

This document covers the technical stack and implementation strategies used across the IBVAP platform.

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS, PostCSS
- **Maps**: Leaflet and React-Leaflet
- **Data Visualization**: Recharts
- **Real-time**: Socket.io-client
- **Client-side ML**: face-api.js for in-browser analysis

### Backend
- **Framework**: Node.js with Express
- **Language**: TypeScript
- **Database ORM**: Prisma
- **Caching & Rate Limiting**: Redis (ioredis, rate-limit-redis)
- **Object Storage**: Minio (S3 compatible)
- **Real-time Communication**: Socket.io
- **Security**: JWT, bcryptjs, Helmet, CORS
- **Blockchain Client**: @hyperledger/fabric-gateway

### Machine Learning
- **Model**: YOLOv11 (`yolo11n.pt`) for object detection
- **Environment**: Python

### Smart Contracts (Chaincode)
- **Network**: Hyperledger Fabric
- **Purpose**: Immutably record alert hashes and critical investigation data to maintain chain of custody for evidence.

## Core Workflows

1. **Video Ingestion & ML Analysis**: Video feeds are processed by the ML service. Objects are detected using YOLO, and events (like virtual fence breaches) are identified.
2. **Alert Generation**: The ML service pushes events to the backend. The backend stores the alert in the database and broadcasts it via Socket.io to connected frontend clients.
3. **Evidence Anchoring**: Critical alerts have their metadata and hashes submitted to the Hyperledger Fabric network via the Fabric Gateway to ensure they cannot be tampered with.
4. **Dashboard & Monitoring**: The frontend displays alerts on a real-time map, showing severity badges and recent events tables, and allows operators to investigate incidents securely.
5.
