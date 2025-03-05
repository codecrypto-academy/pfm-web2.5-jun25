
# Web2

This is the web2 application for the Besu project.

## Getting Started

    npm install
    npm run dev

## Deploying

    npm run build
    npm run start

## Database

The database is a MongoDB instance running on the same machine as the web2 application.

The database is used to store the networks and nodes for the Besu project.

The database is also used to store the accounts for the Besu project.

## Installation mongodb

### Docker Installation

To install MongoDB using Docker:

1. Pull the MongoDB image:
   ```bash
   docker pull mongo
   ```

2. Run MongoDB container:
   ```bash
   docker run --name mongodb -d -p 27017:27017 mongo
   ```

3. To use with authentication (recommended for production):
   ```bash
   docker run --name mongodb -d -p 27017:27017 \
     -e MONGO_INITDB_ROOT_USERNAME=admin \
     -e MONGO_INITDB_ROOT_PASSWORD=password \
     mongo
   ```

4. For data persistence, mount a volume:
   ```bash
   docker run --name mongodb -d -p 27017:27017 \
     -v /path/on/host:/data/db \
     mongo
   ```

5. Connect to MongoDB container:
   ```bash
   docker exec -it mongodb mongosh
   ```

Remember to update your application's connection string accordingly.
