FROM node:18-slim

# Install LaTeX dependencies and PDF conversion tools
RUN apt-get update && apt-get install -y \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra \
    texlive-science \
    ghostscript \
    poppler-utils \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

# Configure ImageMagick policy to allow PDF processing
RUN sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create temp directory for LaTeX output
RUN mkdir -p temp

# Start the bot
CMD ["npm", "start"]
