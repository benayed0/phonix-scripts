FROM node:lts-bullseye
RUN npm install -g npm@latest
# Install system dependencies for Python, Chrome, and Playwright
RUN apt-get update && apt-get install -y \
    curl wget gnupg2 python3 python3-pip python3-dev xvfb \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 \
    libxcomposite1 libxrandr2 libxdamage1 libgbm1 libasound2 \
    libxshmfence1 libx11-xcb1 fonts-liberation libappindicator3-1 \
    lsb-release ca-certificates libxss1 libgconf-2-4 \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome (Stable)
RUN curl -fsSL https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright for Python
RUN pip3 install playwright && playwright install

# Create app working directory
WORKDIR /app

# Copy Node.js files and install
COPY package*.json ./
RUN npm install

# Copy full app codebase
COPY . .

# Build NestJS
RUN npm run build

# Expose port
EXPOSE 3000

# Start NestJS app
CMD ["node", "dist/main.js"]