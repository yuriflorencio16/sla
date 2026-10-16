# Publish a browser-accessible demo

AimRush is a website, not a desktop or mobile app. Its Node server must be hosted to obtain a public HTTPS link. Local file links from the development chat are not hosted websites.

## Render

1. Ensure the project files are committed and pushed to your GitHub repository. Merely preparing them in this workspace does not upload them to GitHub.
2. Create an account at https://render.com/ and connect GitHub with access to that repository.
3. Create a Blueprint from the repository. Render reads `render.yaml` and configures the Node service. Alternatively create a Web Service with Node 24, build command `node --version`, start command `npm start`, and environment variable `HOST=0.0.0.0`.
4. Review the current plan and any costs before creating the service; this blueprint requests the free plan. Render supplies PORT and the public HTTPS URL. Do not invent the service URL before deployment succeeds.
5. Open the URL Render provides. Start a round, hit targets and check settlement. Check the service logs if startup fails.

The blueprint has been prepared locally but has not been deployed. Hosting-account access is not available from this chat.

Free-tier suitability: the SQLite database is stored on the service filesystem. Without a persistent disk, accounts, wallets and rankings can be lost on restarts or redeployment. Free services may sleep when idle and take time to start. This configuration is only for a disposable demo with free credits. Use durable storage and appropriate infrastructure before relying on persistence.

The application has no cash deposits or withdrawals. Public accessibility does not change its prototype limitations, including lack of production account authentication and aimbot prevention.
