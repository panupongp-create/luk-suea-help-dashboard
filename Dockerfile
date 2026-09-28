FROM node:22-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev
COPY index.html app.js server-client.js config.js styles.css styles-v2.css ./
COPY assets ./assets
COPY supabase ./supabase
COPY server/*.mjs ./server/
EXPOSE 3000
CMD ["node", "server/index.mjs"]
