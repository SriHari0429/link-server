const express = require("express");
const geoip = require("geoip-lite");
const useragent = require("useragent");
const shortid = require("shortid");
const fs = require("fs");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = 3000;

app.use(cors()); // Allow frontend to fetch data from backend
app.use(express.static("public")); // Serve frontend files

let linksDB = {}; // Store tracking links
let visitorsData = []; // Store visitor details

// Check for known bots and ignore their requests
const botKeywords = ["bot", "crawler", "spider", "WhatsApp", "facebook", "preview", "Telegram"];
if (botKeywords.some((keyword) => req.headers["user-agent"].toLowerCase().includes(keyword))) {
    console.log("Bot detected, ignoring request.");
    return res.status(403).send("Bot traffic detected, request ignored.");
}

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

    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    let geo = geoip.lookup(ip);
    let agent = useragent.parse(req.headers["user-agent"]);

    // Fetch ISP and VPN detection using an external API
    let isp = "Unknown";
    let vpnDetected = "Unknown";
    try {
        const ipInfo = await axios.get(`https://ipapi.co/${ip}/json/`);
        isp = ipInfo.data.org || "Unknown";
        vpnDetected = ipInfo.data.proxy ? "Yes" : "No";
    } catch (error) {
        console.log("Error fetching ISP info:", error.message);
    }

    let userInfo = {
        ip: ip,
        isp: isp,
        vpnDetected: vpnDetected,
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

    visitorsData.push(userInfo);
    fs.appendFileSync("logs.txt", JSON.stringify(userInfo) + "\n");

    console.log("Visitor Info:", userInfo);
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
