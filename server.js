const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Ensure logs directory exists
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}
const logFile = path.join(logDir, 'game.log');

function writeLog(logObj) {
    const logLine = JSON.stringify(logObj);
    console.log(logLine);
    fs.appendFileSync(logFile, logLine + '\n');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/login', (req, res) => {
    const { username } = req.body;
    writeLog({
        log_level: "info",
        timestamp: new Date().toISOString(),
        event: "login",
        username: username,
        message: "User logged in"
    });
    res.json({ success: true, username });
});

app.post('/api/log', (req, res) => {
    const { username, action, details } = req.body;
    writeLog({
        log_level: "info",
        timestamp: new Date().toISOString(),
        event: action,
        username: username,
        ...details
    });
    res.json({ success: true });
});

app.listen(port, '0.0.0.0', () => {
    writeLog({
        log_level: "info",
        timestamp: new Date().toISOString(),
        event: "server_start",
        message: `Server running and listening on port ${port}`
    });
});
