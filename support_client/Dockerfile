ARG BUILD_FROM
FROM ${BUILD_FROM}

# Install Node.js and dependencies (Debian/Ubuntu)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        nodejs \
        npm \
        bash \
        jq \
        curl \
        python3 \
        python3-requests \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install
COPY package.json ./
RUN if [ -f package.json ]; then npm install --production; fi

# Copy application
COPY server.js ./
COPY jssip-entry.js ./
COPY options_handler.py ./
COPY public/ ./public/

# Copy run script
COPY run.sh /
RUN chmod a+x /run.sh

CMD ["/run.sh"]
