# ReTeX - Discord LaTeX Rendering Bot

A Discord bot that automatically detects and renders LaTeX equations from messages. The bot watches for LaTeX syntax in messages and replies with rendered images.

## Features

- Renders inline LaTeX expressions enclosed in single dollar signs: `$E = mc^2$`
- Renders block LaTeX expressions enclosed in double dollar signs: `$$\int_{a}^{b} f(x) dx$$`
- Supports most LaTeX math symbols and environments including the physics package
- No commands needed - just type LaTeX in your messages
- Dockerized for easy deployment
- Kubernetes manifests for production deployment

## Prerequisites

### Standard Installation
- Node.js (v16 or higher)
- npm (Node Package Manager)
- A Discord bot token
- LaTeX installation on your system

### Docker Installation
- Docker
- A Discord bot token

### Kubernetes Installation
- Kubernetes cluster
- kubectl
- A Discord bot token

## LaTeX Installation (Standard Installation Only)

### Windows

Install MiKTeX or TeX Live:
- MiKTeX: https://miktex.org/download
- TeX Live: https://tug.org/texlive/windows.html

### macOS

Install MacTeX:
- https://tug.org/mactex/

### Linux

Install TeX Live:
```
sudo apt-get install texlive-full
```

## Discord Bot Setup

1. Create a Discord bot and get your token:
   - Go to the [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to the "Bot" tab and click "Add Bot"
   - Under the token section, click "Copy" to copy your token
   - Make sure to enable the "Message Content Intent" under Privileged Gateway Intents

2. Update the `.env` file with your Discord bot token:
   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   ```

3. Invite the bot to your server using the OAuth2 URL generator in the Discord Developer Portal
   - Select the `bot` scope
   - Select permissions: `Send Messages`, `Read Messages/View Channels`, `Attach Files`

## Installation & Usage

### Standard Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the bot:
   ```
   npm start
   ```

### Docker Installation

1. Clone this repository
2. Make sure your Discord bot token is in the `.env` file
3. Build the Docker image:
   ```
   docker build -t retex-bot .
   ```
4. Run the Docker container:
   ```
   docker run -d --name retex-bot --env-file .env retex-bot
   ```
5. To view logs:
   ```
   docker logs -f retex-bot
   ```

### Kubernetes Deployment

1. Clone this repository
2. Build and push the Docker image to your container registry:
   ```
   docker build -t your-registry/retex-bot:latest .
   docker push your-registry/retex-bot:latest
   ```
3. Update the image reference in `k8s/kustomization.yaml` to point to your image
4. Create a Kubernetes secret with your Discord token:
   ```
   kubectl create secret generic retex-bot-secrets --from-literal=DISCORD_TOKEN=your_discord_token_here
   ```
5. Apply the Kubernetes manifests:
   ```
   kubectl apply -k k8s/
   ```
6. To check the status of your deployment:
   ```
   kubectl get pods -l app=retex-bot
   ```
7. To view logs:
   ```
   kubectl logs -l app=retex-bot
   ```

## Using the Bot

In Discord, you can use LaTeX in your messages:

- Inline LaTeX: `$E = mc^2$`
- Block LaTeX: `$$\int_{a}^{b} f(x) dx$$`

The bot will automatically detect LaTeX syntax and reply with a rendered image of your expression.

## Examples

- `$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$`
- `$$\begin{pmatrix} a & b \\ c & d \end{pmatrix}$$`
- `$\lim_{x \to \infty} \frac{1}{x} = 0$`
- `$\braket{\psi|\hat{H}|\psi}$` (using physics package)

## Troubleshooting

- If the bot fails to render LaTeX, check your LaTeX syntax
- Make sure LaTeX is properly installed on your system (standard installation) or that Docker is running correctly (Docker installation)
- For Kubernetes deployments, check pod logs and ensure secrets are properly configured
- Check that the bot has permissions to send messages and attachments in your Discord server

## License

MIT
