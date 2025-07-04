FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 👇 Thêm đoạn này để nhận biến môi trường
ARG NEXT_PUBLIC_BACKEND_API_URL
ENV NEXT_PUBLIC_BACKEND_API_URL=$NEXT_PUBLIC_BACKEND_API_URL

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
