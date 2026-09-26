# IBVAP - Intelligent Border Video Analytics Platform

IBVAP is a comprehensive platform designed for intelligent border monitoring and security. It leverages advanced video analytics, machine learning, and blockchain technology to provide real-time surveillance, threat detection, and immutable evidence tracking.

## Architecture Overview

The system is composed of four main components:
- **Frontend**: A modern web interface built with Next.js, React, and Tailwind CSS. It features real-time alerts, interactive maps (Leaflet), and video analytics dashboards.
- **Backend**: A robust Node.js API built with Express, TypeScript, and Prisma ORM. It handles business logic, real-time communication via Socket.io, and interfaces with the blockchain.
- **ML Services**: A Python-based machine learning module (utilizing YOLO) for real-time video processing, object detection, and threat identification.
- **Blockchain Evidence**: Hyperledger Fabric chaincode to ensure the immutability and integrity of security alerts and evidentiary data.

## Features
- Real-time video analytics and object detection
- Virtual fence editing and monitoring
- Interactive dashboard with mapping
- Role-based access control (RBAC)
- Immutable audit trails via Hyperledger Fabric

## Documentation
- [Startup Guide](./startup.md)
- [Implementation Details](./implementation.md)
deployed
