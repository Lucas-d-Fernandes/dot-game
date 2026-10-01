# Dot Game

A simple interactive web game where players navigate a green dot to reach a red dot without touching the black borders. The project features full observability with Grafana, Loki, and Grafana Alloy to track player sessions, level progression, and completion times.

## Architecture & Tech Stack

- **Frontend/Backend:** HTML/CSS/JS (Vanilla) served via an Express.js server (`server.js`).
- **Telemetry Collection:** Express app logs game events as JSON to `logs/game.log`.
- **Log Parsing & Forwarding:** [Grafana Alloy](https://grafana.com/docs/alloy/latest/) tails `game.log`, parses the JSON fields, applies labels (including `service_name="dot game"`), and forwards to Loki.
- **Log Aggregation:** [Grafana Loki](https://grafana.com/oss/loki/) stores the structured logs.
- **Visualization:** [Grafana](https://grafana.com/grafana/) provides a pre-provisioned dashboard displaying metrics like total players, wins, and player completion times.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/dot-game.git
   cd dot-game
   ```

2. **Start the environment:**
   ```bash
   docker-compose up -d
   ```
   This will spin up the Node.js game server, Grafana Loki, Grafana Alloy, and Grafana.

3. **Access the Game:**
   Open your browser and navigate to [http://localhost:3000](http://localhost:3000). Enter a username and play through the levels.

4. **View the Dashboard:**
   Open your browser and navigate to [http://localhost:3001](http://localhost:3001).
   - Log in with `admin` / `admin` (or skip login as anonymous viewing is enabled).
   - Navigate to the **Dashboards** section and select the **Dot Game Dashboard** to see live player stats!

## License
MIT
