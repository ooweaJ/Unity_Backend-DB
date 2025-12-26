FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["./wait-for-it.sh", "mysql:3306", "--", "node", "server.js"]

