FROM node:14.19.3

WORKDIR /App

COPY package.json .

RUN npm install --force

COPY . .

EXPOSE 7000

CMD ["npm","start"]