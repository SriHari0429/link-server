const express = require("express");
const geoip = require("geoip-lite");
const useragent = require("useragent");
const shortid = require("shortid");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors()); // Allow frontend to fetch data from backend
app.use(express.static("public")); // Serve frontend files

let linksDB = {}; // Store tracking links
let visitorsData = []; // Store visitor details

// Generate a unique tracking link
app.get("/generate", (req, res) => {
    let uniqueID = shortid.generate();
    let destination = req.query.redirect || "https://google.com"; // Default redirect
    linksDB[uniqueID] = destination;

    let trackingLink = `https://${process.env.RAILWAY_STATIC_URL || 'your-app-name.up.railway.app'}/track/${uniqueID}`;
    console.log(`Generated Tracking Link: ${trackingLink}`);

    res.json({ trackingLink });
});

// Track user details when they click the link
app.get("/track/:id", async (req, res) => {
    let id = req.params.id;
    let destination = linksDB[id] || "https://google.com";

    // Detect social media bots
    const botKeywords = ["bot", "crawler", "spider", "WhatsApp", "facebook", "preview", "Telegram"];
    let userAgent = req.headers["user-agent"] ? req.headers["user-agent"].toLowerCase() : "";

    if (botKeywords.some(keyword => userAgent.includes(keyword))) {
        console.log("Bot detected, ignoring request.");
        return res.status(403).send("Bot traffic detected, request ignored.");
    }

    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    let geo = geoip.lookup(ip);
    let agent = useragent.parse(req.headers["user-agent"]);

    let userInfo = {
        ip: ip,
        country: geo ? geo.country : "Unknown",
        city: geo ? geo.city : "Unknown",
        region: geo ? geo.region : "Unknown",
        latitude: geo ? geo.ll[0] : "Unknown",
        longitude: geo ? geo.ll[1] : "Unknown",
        timezone: geo ? geo.timezone : "Unknown",
        browser: agent.family,
        browserVersion: agent.major,
        os: agent.os.family,
        osVersion: agent.os.major,
        device: agent.device.family,
        referrer: req.headers["referer"] || "Direct Visit",
        screenResolution: req.headers["sec-ch-ua-mobile"] ? "Mobile" : "Desktop",
        timestamp: new Date().toISOString(),
        networkType: req.headers["sec-ch-ua-platform"] || "Unknown",
    };

    console.log("Visitor Info:", userInfo);
    visitorsData.push(userInfo);

    // Save visitor data to logs.txt
    fs.appendFileSync("logs.txt", JSON.stringify(userInfo) + "\n");

    // Redirect user to the original destination
    res.redirect(destination);
});
// API to fetch visitor data
app.get("/visitors", (req, res) => {
    res.json(visitorsData);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
