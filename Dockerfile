FROM node:12

WORKDIR /app

COPY package.json /app

COPY . /app

RUN npm install

RUN npm run-script build

EXPOSE 80

CMD [ "npm", "run", "server" ] 