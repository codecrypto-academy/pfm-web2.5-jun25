# jmvelasco
###### Codecrypto Academy Student Repo


## Instructor repository
- https://github.com/jviejocodecripto?tab=repositories
- https://github.com/Jviejo?tab=repositories

---

# 📚 Course Exercises Documentation

## 🎓 Course Overview

This repository contains a collection of exercises and projects from the CodeCrypto Academy course. Each folder represents a different exercise or project assignment covering various aspects of blockchain development, cryptocurrency tools, and web3 technologies.

---

## 📁 Exercise Structure

### 1. **Wallet Address Book Exercise** (`/backend` + `/front`)

**Exercise Objective**: Build a full-stack application for managing cryptocurrency wallet contacts

**Backend Exercise (`/backend`)**
- **Learning Goals**: REST API development, database design, authentication
- **Technology Stack**: Node.js, Express, TypeScript, Prisma, MongoDB
- **Exercise Features**:
  - User registration and authentication with bcrypt
  - Contact management (CRUD operations)
  - Contacts book organization
  - Wallet address validation
  - JWT-based authentication

**Database Schema**:
```prisma
- User: id, name, email, password, createdAt, updatedAt
- ContactsBook: id, ownerId, owner (relation), createdAt, updatedAt
- Contacts: id, name, walletAddress, contactsBookId, createdAt, updatedAt
```

**Frontend Exercise (`/front`)**
- **Learning Goals**: React development, Web3 integration, state management
- **Technology Stack**: React, TypeScript, Vite, React Router, React Query
- **Exercise Features**:
  - User authentication (Login/Register)
  - Contact management interface
  - Wallet balance checking
  - Transfer functionality
  - Protected routes
  - MetaMask integration

### 2. **Blockchain Manager Exercise** (`/blockchain-manager`)

**Exercise Objective**: Learn Hyperledger Besu node management and Docker automation

**Exercise Components**:
- **Script Exercise (`/script`)**: Shell scripting for node deployment and testing
- **Library Exercise (`/lib-dockercode`)**: TypeScript library development for Docker container management
- **Web Interface Exercise (`/web`)**: Next.js application for network management

**Learning Goals**:
- Docker-based node deployment
- Clique consensus protocol implementation
- Multi-node network creation
- REST API for network management
- Web interface for node operations
- Automated testing with Jest

**Technology Stack**:
- Hyperledger Besu
- Docker & Dockerode
- TypeScript
- Next.js 15
- Tailwind CSS
- Jest for testing

### 3. **Blockchain Balance Checker Exercise** (`/console`)

**Exercise Objective**: Learn multi-chain balance monitoring and Web3 integration

**Learning Goals**:
- **EVM Chains**: Ethereum, Polygon balance checking
- **Solana**: Devnet balance monitoring
- **Token Support**: ERC-20 token balance checking
- **Web3 Integration**: ethers.js and @solana/web3.js

**Exercise Scripts**:
- `evm-balances.js`: Ethereum/Polygon balance checker
- `solana.js`: Solana balance checker
- `utils.js`: Web3 utility functions

### 4. **Cryptographic Tools Exercise** (`/proyectos/cripto`)

**Exercise Objective**: Learn cryptographic operations and file encryption/decryption

**Learning Goals**:
- ECDH key pair generation (secp521r1/secp256k1)
- File encryption and decryption
- Stream-based processing for large files
- Command-line interface with yargs

**Exercise Commands**:
```bash
# Generate key pair
npm start -- --key_name mykey

# Encrypt/Decrypt files
npm run dev
```

### 5. **E-commerce with Blockchain Exercise** (`/proyectos/cesta`)

**Exercise Objective**: Build an e-commerce application with blockchain integration

**Exercise Components**:
- **Frontend Exercise (`cesta-app`)**: React + TypeScript shopping cart
- **Backend Exercise (`cesta-backend`)**: Node.js API development
- **Database Exercise (`db`)**: PostgreSQL with Northwind sample data
- **Blockchain Exercise (`node-eth`)**: Private Ethereum network with Geth

**Learning Goals**:
- Product catalog management
- Shopping cart functionality
- User authentication
- Blockchain integration
- Private Ethereum network setup

### 6. **Blockchain Clients Exercise** (`/blockchain-clients`)

**Exercise Objective**: Learn different blockchain client implementations

**Exercise Components**:
- **Besu Exercise (`/besu`)**: Hyperledger Besu network setup
- **Geth Exercise (`/geth`)**: Ethereum Geth node configuration

**Learning Goals**:
- Different blockchain client configurations
- Network setup and management
- Genesis block configuration
- Node deployment strategies

---

## 🛠️ Technologies Covered in Course

### Backend Technologies
- **Node.js** with TypeScript
- **Express.js** for REST APIs
- **Prisma** for database ORM
- **MongoDB** for data storage
- **PostgreSQL** for e-commerce exercise
- **bcrypt** for password hashing
- **JWT** for authentication

### Frontend Technologies
- **React** with TypeScript
- **Next.js** for blockchain manager exercise
- **Vite** for development
- **React Router** for navigation
- **React Query** for data fetching
- **Tailwind CSS** for styling
- **Radix UI** for components

### Blockchain Technologies
- **Hyperledger Besu** for enterprise blockchain
- **Ethereum Geth** for private networks
- **Ethers.js** for EVM interactions
- **@solana/web3.js** for Solana
- **Web3.js** for blockchain utilities

### DevOps & Tools
- **Docker** for containerization
- **Dockerode** for programmatic Docker control
- **Jest** for testing
- **ESLint** for code quality
- **TypeScript** for type safety

---

## 🚀 Exercise Setup Instructions

### Prerequisites
- Node.js (v18+)
- Docker Desktop
- MongoDB (for wallet exercise)
- PostgreSQL (for e-commerce exercise)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd jmvelasco
```

2. **Install dependencies for each exercise**
```bash
# Wallet Address Book Exercise
cd backend && npm install
cd ../front && npm install

# Blockchain Manager Exercise
cd ../blockchain-manager/lib-dockercode && npm install
cd ../web && npm install

# Console Tools Exercise
cd ../../console && npm install

# Cryptographic Tools Exercise
cd ../proyectos/cripto && npm install

# E-commerce Exercise
cd ../cesta/cesta-app && npm install
cd ../cesta-backend && npm install
```

3. **Environment Setup**
```bash
# Backend Exercise (.env)
DATABASE_URL="mongodb://localhost:27017/wallet-address-book"
PORT=3000
JWT_SECRET=your-secret-key

# Console Exercise (.env.local)
WALLET_ADDRESS=your-wallet-address
```

4. **Database Setup**
```bash
# MongoDB (Wallet Exercise)
cd backend
npx prisma generate
npx prisma db push

# PostgreSQL (E-commerce Exercise)
cd proyectos/cesta/db
docker-compose up -d
```

---

## 📋 Exercise Status

### ✅ Completed Exercises
- Wallet Address Book (Backend + Frontend)
- Blockchain Balance Checker
- Cryptographic Tools
- E-commerce Project Structure
- Hyperledger Besu Library

### 🔄 In Progress Exercises
- Blockchain Manager Web Interface
- Advanced Testing Implementation

### 📝 Planned Exercises
- Enhanced Security Features
- Multi-chain Support Expansion
- Performance Optimizations

---

## 🧪 Exercise Testing

### Wallet Address Book Exercise
```bash
cd backend
npm test
```

### Blockchain Manager Library Exercise
```bash
cd blockchain-manager/lib-dockercode
npm test
```

### Console Tools Exercise
```bash
cd console
npm run start:evm    # Check EVM balances
npm run start:solana # Check Solana balances
```

---

## 📖 Exercise API Documentation

### Wallet Address Book Exercise API

**Base URL**: `http://localhost:3000`

**Endpoints**:
- `POST /user` - User registration
- `POST /users` - User login
- `GET /user/:id` - Get user details
- `POST /contacts_book` - Create contacts book
- `GET /contacts_book/:id` - Get contacts book
- `POST /contact` - Create contact
- `PUT /contact/:id` - Update contact
- `DELETE /contact/:id` - Delete contact

### Blockchain Manager Exercise API

**Base URL**: `http://localhost:3001`

**Endpoints**:
- `POST /api/networks` - Create network
- `DELETE /api/networks/:id` - Delete network
- `POST /api/networks/:id/nodes` - Add node
- `DELETE /api/networks/:id/nodes/:nodeId` - Remove node

---

## 🔧 Exercise Development Commands

### Wallet Address Book Exercise
```bash
# Backend
cd backend
npm run dev      # Development server
npm run build    # Build for production
npm start        # Production server

# Frontend
cd front
npm run dev      # Development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Blockchain Manager Exercise
```bash
# Library
cd blockchain-manager/lib-dockercode
npm run build    # Build library
npm test         # Run tests

# Web Interface
cd blockchain-manager/web
npm run dev      # Development server
npm run build    # Build for production
```

### Console Tools Exercise
```bash
cd console
npm run dev      # Development mode
npm run start:evm    # Check EVM balances
npm run start:solana # Check Solana balances
```

---

## 📝 Exercise Notes

- Each exercise is designed to teach specific blockchain and web3 concepts
- All exercises use TypeScript for type safety
- Docker is used for blockchain node deployment exercises
- Environment variables are required for proper configuration
- Database migrations should be run before starting applications
- Blockchain networks require proper genesis configuration
- Each exercise can be completed independently
