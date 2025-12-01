FROM node:lts-alpine

COPY ./ ./
RUN npm install
ENV NODE_ENV=production
CMD ["node", "indexStats.js"]
