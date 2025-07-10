# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview

This is a Next.js application for managing Hyperledger Besu networks. The application provides a web interface for creating, editing, and deleting Besu blockchain networks using a REST API that integrates with the besu-network-lib.

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Blockchain**: Hyperledger Besu with Clique consensus
- **External Library**: besu-network-lib (located in ../lib)

## Project Structure

- `/src/app` - Next.js App Router pages and layouts
- `/src/app/api` - REST API endpoints
- `/src/components` - Reusable React components
- `/src/lib` - Utility functions and configurations
- `/src/types` - TypeScript type definitions

## Key Features

1. **Network Management**: Create, read, update, delete Besu networks
2. **Form Validation**: Robust form validation for network configurations
3. **Network Listing**: Display and manage existing networks
4. **Real-time Status**: Show network status and connectivity
5. **REST API**: Complete CRUD operations via API endpoints

## Code Guidelines

- Use TypeScript strict mode
- Follow Next.js 14 best practices with App Router
- Use Tailwind CSS for styling
- Implement proper error handling and validation
- Use React Server Components where possible
- Follow RESTful API conventions
- Implement proper loading states and error boundaries

## Besu Network Integration

- Import and use functions from besu-network-lib (../lib)
- Handle Docker operations and network management
- Implement proper cleanup of resources
- Validate network configurations before creation
- Handle asynchronous operations properly

## API Endpoints Structure

- `GET /api/networks` - List all networks
- `POST /api/networks` - Create new network
- `GET /api/networks/[id]` - Get specific network
- `PUT /api/networks/[id]` - Update network
- `DELETE /api/networks/[id]` - Delete network
- `POST /api/networks/[id]/start` - Start network
- `POST /api/networks/[id]/stop` - Stop network

## UI/UX Guidelines

- Use modern, clean design with Tailwind CSS
- Implement responsive design for mobile and desktop
- Provide clear feedback for all user actions
- Use loading spinners and progress indicators
- Display error messages clearly
- Implement form validation with helpful error messages
- Use consistent color scheme and typography
