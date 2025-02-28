# Database initialization

Run the container

```
cd database-infraestructure
docker-compose up -d
```


Initialize prisma connector

```
npx prisma generate
npx prisma db push
```

# Run the app

```
yarn dev
```
