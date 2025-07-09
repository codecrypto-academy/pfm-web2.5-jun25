# jmvelasco
###### Codecrypto Academy Student Repo

## Instructor repository
- https://github.com/jviejocodecripto?tab=repositories
- https://github.com/Jviejo?tab=repositories

---

# 📚 Project Documentation

## 🏗️ Overview

This repository contains a collection of independent blockchain and cryptocurrency development projects. Each project is self-contained with its own setup, configuration, and documentation.

---

## 🌐 Local Blockchain Networks

This repository includes several local blockchain networks configured for MetaMask:

### **MetaMask Network Configuration:**

#### **1. GETH Local Network (KHLOE.A)**
- **RPC URL**: `http://localhost:8545`
- **Chain ID**: `7401`
- **Currency Symbol**: `KHLOE.A`
- **Configuration Location**: `blockchain-clients/geth/eth-geth-node/`

#### **2. Besu Local Network (KHLOE.B)**
- **RPC URL**: `http://localhost:8546`
- **Chain ID**: `7402`
- **Currency Symbol**: `KHLOE.B`
- **Configuration Location**: `blockchain-clients/besu/eth-besu-node/`

#### **3. GETH Multi-Node Network (KHLOE.C)**
- **RPC URL**: `http://localhost:30306`
- **Chain ID**: `7403`
- **Currency Symbol**: `KHLOE.C`
- **Configuration Location**: `blockchain-clients/geth/ethereum-network/`

#### **4. Northwind E-commerce Network (KHLOE)**
- **RPC URL**: `http://localhost:8888`
- **Chain ID**: `35001`
- **Currency Symbol**: `KHLOE`
- **Configuration Location**: `proyectos/cesta/node-eth/`

---

## 📁 Projects

### 1. **Wallet Address Book Application**

**Location**: `/backend` + `/front`

#### **Description**
Full-stack application for managing cryptocurrency wallet contacts with user authentication, contact management, and blockchain integration.

#### **Project Relationships**
- **Connected Projects**: Frontend and Backend work together
- **Frontend** → **Backend API** at `http://localhost:3000`
- **Backend** → **MongoDB** database
- **Backend** → **Blockchain networks** for balance checking

#### **Technology Stack**
- **Backend**: Node.js, Express, TypeScript, Prisma, MongoDB, bcrypt, JWT
- **Frontend**: React, TypeScript, Vite, React Router, React Query
- **Blockchain**: ethers.js for Web3 integration

#### **Features**
- User registration and authentication
- Contact management (CRUD operations)
- Wallet address validation
- Blockchain balance checking
- MetaMask integration
- Protected routes

#### **Database Schema**
```prisma
- User: id, name, email, password, createdAt, updatedAt
- ContactsBook: id, ownerId, owner (relation), createdAt, updatedAt
- Contacts: id, name, walletAddress, contactsBookId, createdAt, updatedAt
```

#### **Prerequisites**
- Node.js (v18+)
- MongoDB
- MetaMask browser extension

#### **Installation & Setup**

1.  **Clone and navigate**
```bash
cd backend
npm install
cd ../front
npm install
```

2.  **Start MongoDB Database**
    Navigate to the database infrastructure directory and start the MongoDB container:
    ```bash
    cd backend/database-infraestructure
    docker-compose up -d
    cd ../..
    ```

3.  **Environment Configuration**
```bash
# Backend (.env)
DATABASE_URL="mongodb://localhost:27017/wallet-address-book"
PORT=3000
JWT_SECRET=your-secret-key
```

4.  **Database Setup**
```bash
cd backend
npx prisma generate
npx prisma db push
```

5.  **Start Services**
```bash
# Backend (Terminal 1)
cd backend
npm run dev

# Frontend (Terminal 2)
cd front
npm run dev
```

6.  **Stop MongoDB Database**
    To stop the MongoDB container when you are finished:
    ```bash
    cd backend/database-infraestructure
    docker-compose down
    cd ../..
    ```

#### **API Endpoints**
- `POST /user` - User registration
- `POST /users` - User login
- `GET /user/:id` - Get user details
- `POST /contacts_book` - Create contacts book
- `GET /contacts_book/:id` - Get contacts book
- `POST /contact` - Create contact
- `PUT /contact/:id` - Update contact
- `DELETE /contact/:id` - Delete contact

#### **Development Commands**
```bash
# Backend
npm run dev      # Development server
npm run build    # Build for production
npm start        # Production server

# Frontend
npm run dev      # Development server
npm run build    # Build for production
npm run preview  # Preview production build
```

#### **Testing**
```bash
cd backend
npm test
```

---

### 2. **Blockchain Manager**

**Location**: `/blockchain-manager`

#### **Description**
This project provides two distinct methods for managing a Hyperledger Besu blockchain network: a self-contained shell script for quick deployments and a TypeScript-based library for programmatic control and testing.

#### **Project Relationships**
- **Independent Project**: Self-contained within the `blockchain-manager` directory.
- **Components**: The shell script (`script/docker.sh`) and the TypeScript library (`lib`) offer independent functionalities.
- **Library (`lib`)**: Interacts with **Docker** via `dockerode`.
- **Web Interface (`web`)**: (Planned/In Progress) will interact with the Library for network operations.

#### **Technology Stack**
- **Shell Script**: Bash, Docker
- **Library**: TypeScript, Dockerode, Ethers.js, Elliptic, Keccak256, Jest (for testing)
- **Blockchain**: Hyperledger Besu

#### **Features**
- Docker-based node deployment (via shell script or TypeScript library)
- Clique consensus protocol implementation
- Multi-node network creation
- Programmatic network management (via TypeScript library)
- End-to-end testing of network functionality
- Automated key generation, genesis file creation, and node configuration

#### **Components**
- **Script (`/script`)**: Contains `docker.sh` for an automated, hardcoded network setup, and `index.mjs` for various network commands.
- **Library (`/lib`)**: A TypeScript application for programmatic control of the network. It includes:
    -   Configuration constants in `src/constants.ts`.
    -   Main application logic in `src/app.ts` for node creation.
    -   End-to-end network tests in `src/test_network.ts`.
-   **Web Interface (`/web`)**: (Planned/In Progress) This component is for a web interface that will interact with the library. Note: This directory may not yet exist in the current project structure but is part of the overall plan.

#### **Prerequisites**
- Docker
- Node.js (v14+)
- Yarn
- TypeScript (for `lib` project)

#### **Installation & Setup**
Detailed installation and setup instructions for both the shell script and the TypeScript library are available in `blockchain-manager/documentation/BlockchainNetworkGuide.md`.

For a quick overview:
1.  **For the TypeScript Library (`lib`):**
    ```bash
    cd blockchain-manager/lib
    yarn install
    yarn build
    ```
2.  **To create the network using the shell script:**
    ```bash
    ./blockchain-manager/script/docker.sh
    ```
3.  **To create the network using the TypeScript application:**
    ```bash
    cd blockchain-manager/lib
    yarn start
    ```

#### **Development Commands**
For a comprehensive list of commands for both the shell script and the TypeScript library, refer to `blockchain-manager/documentation/BlockchainNetworkGuide.md`.

Key commands for the `lib` project:
```bash
cd blockchain-manager/lib
yarn dev            # Development server with nodemon
yarn build          # Compile TypeScript to JavaScript
yarn start          # Run the main application (creates network nodes)
yarn test           # Run unit tests
yarn check-blockchain # Run end-to-end network tests
```

#### **Testing**
End-to-end network tests for the TypeScript library are located in `blockchain-manager/lib/src/test_network.ts` and can be run with `yarn check-blockchain` from the `blockchain-manager/lib` directory.

---

### 3. **Blockchain Balance Checker**

**Location**: `/console`

#### **Description**
Multi-chain balance monitoring tool for checking balances on Ethereum, Polygon, and Solana networks.

#### **Project Relationships**
- **Independent Project**: Standalone utility
- **Connects to**: External blockchain networks (Ethereum, Polygon, Solana)

#### **Technology Stack**
- **Runtime**: Node.js
- **Blockchain**: ethers.js, @solana/web3.js
- **Utilities**: Web3.js

#### **Features**
- EVM chains balance checking (Ethereum, Polygon)
- Solana devnet balance monitoring
- ERC-20 token balance checking
- Web3 integration

#### **Scripts**
- `evm-balances.js`: Ethereum/Polygon balance checker
- `solana.js`: Solana balance checker
- `utils.js`: Web3 utility functions

#### **Prerequisites**
- Node.js (v18+)
- Internet connection for blockchain APIs

#### **Installation & Setup**

1. **Install Dependencies**
```bash
cd console
npm install
```

2. **Environment Configuration**
```bash
# .env.local
WALLET_ADDRESS=your-wallet-address
```

3. **Run Scripts**
```bash
# Check EVM balances
npm run start:evm

# Check Solana balances
npm run start:solana

# Development mode
npm run dev
```

#### **Usage Examples**
```bash
# Check Ethereum/Polygon balance
npm run start:evm

# Check Solana balance
npm run start:solana
```

#### **Development Commands**
```bash
npm run dev      # Development mode
npm run start:evm    # Check EVM balances
npm run start:solana # Check Solana balances
```

---

### 4. **Cryptographic Tools**

**Location**: `/proyectos/cripto`

#### **Description**
Command-line cryptographic operations tool for file encryption/decryption using ECDH key pairs.

#### **Project Relationships**
- **Independent Project**: Standalone utility
- **No external dependencies** except Node.js

#### **Technology Stack**
- **Runtime**: Node.js, TypeScript
- **Cryptography**: Node.js crypto module
- **CLI**: yargs

#### **Features**
- ECDH key pair generation (secp521r1/secp256k1)
- File encryption and decryption
- Stream-based processing for large files
- Command-line interface

#### **Prerequisites**
- Node.js (v18+)

#### **Installation & Setup**

1. **Install Dependencies**
```bash
cd proyectos/cripto
npm install
```

2. **Generate Key Pair**
```bash
npm start -- --key_name mykey
```

3. **Encrypt/Decrypt Files**
```bash
npm run dev
```

#### **Commands**
```bash
# Generate key pair
npm start -- --key_name mykey

# Encrypt/Decrypt files
npm run dev
```

#### **File Structure**
- `keys/`: Generated key pairs
- `input-data/`: Files to encrypt
- `output/`: Encrypted/decrypted files

---

### 5. **E-commerce with Blockchain**

**Location**: `/proyectos/cesta`

#### **Description**
E-commerce application with blockchain integration, including shopping cart, product catalog, and private Ethereum network.

#### **Project Relationships**
- **Connected Projects**: Multiple components work together
- **Frontend** → **Backend API** at `http://localhost:3000`
- **Backend** → **PostgreSQL** database
- **Backend** → **Private Ethereum** network
- **Database** → **Northwind** sample data

#### **Technology Stack**
- **Frontend**: React, TypeScript, Vite, React Router
- **Backend**: Node.js, Express, TypeScript, PostgreSQL
- **Database**: PostgreSQL with Northwind data
- **Blockchain**: Ethereum Geth, ethers.js
- **Styling**: Bootstrap

#### **Features**
- Product catalog management
- Shopping cart functionality
- User authentication
- Blockchain integration
- Private Ethereum network setup

#### **Components**
- **Frontend (`cesta-app`)**: React shopping cart
- **Backend (`cesta-backend`)**: Node.js API
- **Database (`db`)**: PostgreSQL setup
- **Blockchain (`node-eth`)**: Private Ethereum network

#### **Prerequisites**
- Node.js (v18+)
- Docker Desktop
- PostgreSQL

#### **Installation & Setup**

1. **Install Frontend Dependencies**
```bash
cd proyectos/cesta/cesta-app
npm install
```

2. **Install Backend Dependencies**
```bash
cd proyectos/cesta/cesta-backend
npm install
```

3. **Setup Database**
```bash
cd proyectos/cesta/db
docker-compose up -d
```

4. **Setup Blockchain Network**
```bash
cd proyectos/cesta/node-eth
docker-compose up -d
```

5. **Start Services**
```bash
# Backend (Terminal 1)
cd proyectos/cesta/cesta-backend
npm run dev

# Frontend (Terminal 2)
cd proyectos/cesta/cesta-app
npm run dev
```

#### **Database Configuration**
- **Host**: localhost
- **Port**: 55432
- **Database**: northwind
- **User**: postgres
- **Password**: postgres

#### **Blockchain Network**
- **RPC URL**: `http://localhost:8888`
- **Chain ID**: `35001`
- **Currency Symbol**: `KHLOE`

#### **API Endpoints**
- `GET /products` - Get product catalog
- `GET /product/:id` - Get product details

#### **Development Commands**
```bash
# Frontend
npm run dev      # Development server
npm run build    # Build for production

# Backend
npm run dev      # Development server
npm run build    # Build for production
```

---

## 📋 Project Status

### ✅ Completed Projects
- Wallet Address Book (Backend + Frontend)
- Blockchain Balance Checker
- Cryptographic Tools
- E-commerce Project Structure
- Hyperledger Besu Library

### 🔄 In Progress Projects
- Blockchain Manager Web Interface
- Advanced Testing Implementation

### 💡 Planned Projects
- Enhanced Security Features
- Multi-chain Support Expansion
- Performance Optimizations

---

## 📝 Notes

- Each project can be completed independently
- All projects use TypeScript for type safety
- Docker is used for blockchain node deployment
- Environment variables are required for proper configuration
- Database migrations should be run before starting applications
- Blockchain networks require proper genesis configuration
- MetaMask must be configured with local networks manually
