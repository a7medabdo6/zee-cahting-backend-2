FROM node:18.17.1

WORKDIR /App

COPY package.json .

RUN npm install --force

COPY . .

EXPOSE 7000

CMD ["npm","start"]