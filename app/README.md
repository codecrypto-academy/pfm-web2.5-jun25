# Besu Network Manager

A modern Next.js application for managing Hyperledger Besu blockchain networks with a clean, intuitive interface and powerful REST API.

## Features

- 🚀 **Network Management**: Create, edit, delete, and monitor Besu networks
- 🔗 **REST API**: Complete CRUD operations for network management
- 🎨 **Modern UI**: Built with Next.js 14, TypeScript, and Tailwind CSS
- 📝 **Form Validation**: Robust form handling with Zod validation
- 🐳 **Docker Integration**: Seamless Docker container management
- 🌐 **Network Configuration**: Support for Clique and IBFT2 consensus
- 📊 **Real-time Status**: Monitor network health and connectivity

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Heroicons
- **Backend**: Next.js API Routes
- **Blockchain**: Hyperledger Besu with Clique consensus

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd besu-network-manager
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # REST API endpoints
│   │   ├── networks/      # Network CRUD operations
│   │   └── cleanup/       # Network cleanup operations
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main networks page
├── components/            # React components
│   ├── NetworkCard.tsx    # Network status card
│   └── NetworkForm.tsx    # Network creation/editing form
├── lib/                   # Utility libraries
│   ├── besu-service.ts    # Besu network operations
│   ├── besu-utils.ts      # Utility functions
│   └── network-store.ts   # In-memory network storage
└── types/                 # TypeScript type definitions
    └── besu.ts            # Besu-related types
```

## API Reference

### Networks

- **GET** `/api/networks` - List all networks
- **POST** `/api/networks` - Create new network
- **GET** `/api/networks/[id]` - Get specific network
- **PUT** `/api/networks/[id]` - Update network
- **DELETE** `/api/networks/[id]` - Delete network
- **POST** `/api/networks/[id]/start` - Start network
- **POST** `/api/networks/[id]/stop` - Stop network

### Cleanup

- **POST** `/api/cleanup` - Cleanup all networks

### Example Network Configuration

```json
{
  "name": "my-besu-network",
  "chainId": 1337,
  "consensus": "clique",
  "gasLimit": "0x1fffffffffffff",
  "blockTime": 5,
  "subnet": "172.20.0.0/16",
  "signerAccounts": [
    {
      "address": "0x1234567890123456789012345678901234567890",
      "weiAmount": "1000000000000000000000"
    }
  ]
}
```

## Network Configuration

### Consensus Mechanisms

- **Clique**: Proof of Authority consensus for development/testing
- **IBFT2**: Istanbul Byzantine Fault Tolerant consensus for production

### Node Types

- **Bootnode**: Discovery and bootstrap node
- **Miner**: Mining node (for Clique consensus)
- **RPC**: JSON-RPC endpoint node
- **Validator**: Validation node (for IBFT2 consensus)

### Default Configuration

- **Chain ID**: 1337 (customizable)
- **Gas Limit**: 0x1fffffffffffff
- **Block Time**: 5 seconds
- **RPC Ports**: 8545-9999 range
- **Network Subnet**: Auto-generated

## Form Validation

The application includes comprehensive form validation:

- Network name: 1-50 characters
- Chain ID: 1-999999
- Ethereum addresses: Valid checksum format
- ETH amounts: Positive decimal numbers
- RPC ports: 8545-9999 range, no conflicts
- At least one signer account and node required

## Error Handling

- Comprehensive error messages for all operations
- Form validation with real-time feedback
- API error handling with user-friendly messages
- Loading states for all async operations

## Development

### Code Style

- TypeScript strict mode enabled
- ESLint configuration included
- Tailwind CSS for consistent styling
- React Server Components where appropriate

### Type Safety

All components and functions are fully typed with TypeScript, including:

- Network configurations
- API request/response types
- Form data validation
- Component props

## Integration with besu-network-lib

The application is designed to integrate with the `besu-network-lib` located in `../lib`. Currently uses a mock service layer that can be easily replaced with actual library calls.

## Docker Support

The application manages Hyperledger Besu networks using Docker containers:

- Automatic container lifecycle management
- Network isolation with Docker Compose
- Volume management for persistent data
- Health checking and status monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:

- Create an issue on GitHub
- Check the documentation
- Review the API reference

---

Built with ❤️ using Next.js and Hyperledger Besu
