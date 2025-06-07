---
# Dockerfile
FROM node:18

WORKDIR /app

COPY . .

RUN npm install && npm run build

EXPOSE 5488

CMD ["node", "server.js"]

---
# docker-compose.yml
version: "3.8"

services:
  postgres:
    image: postgres:15
    container_name: jsreport-postgres
    restart: always
    environment:
      POSTGRES_USER: ${Dev_lead}
      POSTGRES_PASSWORD: ${Access_passwd}
      POSTGRES_DB: ${My_db}
    ports:
      - "5432:5432"

  jsreport:
    image: localhost:5000/jsreport:latest
    container_name: jsreport
    restart: always
    depends_on:
      - postgres
    environment:
      - store_provider=postgresql
      - extensions_authentication_admin_username=admin
      - extensions_authentication_admin_password=admin
      - postgres_host=postgres
      - postgres_port=5432
      - postgres_user=jsreport
      - postgres_password=password
      - postgres_database=jsreportdb
    ports:
      - "5488:5488"

