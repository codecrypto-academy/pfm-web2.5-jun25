# Project Objectives for Hyperledger Besu Automation

GITHUB: https://github.com/codecrypto-academy/web25-besu-2025.git

## Main Objectives

0. **Motivation**
- Docker automation
- Script development
- Understanding how a Hyperledger Besu node works
- Understanding Docker internal networks
- Using Docker programmatically   

1. **Implementation**

- The Clique protocol must be used
- Docker will be used to deploy nodes
- Linux/Mac/WSL on Windows will be used
- The hyperledger/besu:latest image will be used

2. **Levels**

- Level 1. 2 points:
    - Deploy multiple nodes through Docker commands in a script
    - DELIVERABLE: Script that creates the network and tests it by making transactions
- Level 2. 3 points:
    - Development of a TypeScript library that allows creating networks and nodes
    - In this library we will create tests to validate the node
    - DELIVERABLE: Library code with passing tests
- Level 3. 2 Points:
    - Create a REST API using NextJS in TypeScript that: - Uses the library developed in level 2,  allowing Creating, Deleting, Adding/Removing nodes to a network
    DELIVERABLE: Backend code
- Level 4. 2 Points:
    - Create a FRONTEND in the same project that uses the REST API to handle network creation
    DELIVERABLE: Frontend code

3. **Project Organization**

- Script. We will put a script.sh file here that will contain all the steps to create a node. Test it. 
    1. It it in the repo. Adapt it to the project.

- Library. We will put the library in the lib folder.
    1. In the lib folder we will put the library code with test.
    
- Backend. We will create a backend in the nextjs folder frontback.
    1. Make a proyect nextjs typescript in the frontback folder.
    2. Use the library in the frontback folder.
    3. Make a api rest using  the library.

- Frontend. We will create a frontend in the nextjs folder frontback.
    1. Make a frontend using the api rest.
    2. Use the api rest to create, delete, add/remove nodes to a network.
