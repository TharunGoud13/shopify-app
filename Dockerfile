FROM node:18-alpine

EXPOSE 3000

WORKDIR /app

RUN apk add --no-cache openssl

# ENV NODE_ENV=production

COPY package.json package-lock.json* ./

#RUN npm ci --omit=dev && npm cache clean --force
RUN npm ci && npm cache clean --force
RUN npm install tailwindcss --no-save

# Remove CLI packages since we don't need them in production by default.
# Remove this line if you want to run CLI commands in your container.
RUN npm remove @shopify/cli

COPY . .

RUN npm run build:dev

CMD ["npm", "run", "docker-start"]