const express = require("express");
const geoip = require("geoip-lite");
const useragent = require("useragent");
const shortid = require("shortid");
const fs = require("fs");

const app = express();
const PORT = 3000;

let linksDB = {}; // Store tracking links

// Generate a unique tracking link
app.get("/generate", (req, res) => {
    let uniqueID = shortid.generate();
    let destination = req.query.redirect || "https://google.com"; // Default redirect

    linksDB[uniqueID] = destination;

    let trackingLink = `https://${process.env.RAILWAY_STATIC_URL || 'your-app-name.up.railway.app'}/track/${uniqueID}`;


    console.log(`Generated Tracking Link: ${trackingLink}`);

    res.send(`Your tracking link: <a href="${trackingLink}" target="_blank">${trackingLink}</a>`);
});

// Track user details when they click the link
app.get("/track/:id", (req, res) => {
    let id = req.params.id;
    let destination = linksDB[id] || "https://google.com";

    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    let geo = geoip.lookup(ip);
    let agent = useragent.parse(req.headers["user-agent"]);

    let userInfo = {
        ip: ip,
        country: geo ? geo.country : "Unknown",
        city: geo ? geo.city : "Unknown",
        region: geo ? geo.region : "Unknown",
        browser: agent.family,
        os: agent.os.family,
        device: agent.device.family,
        timestamp: new Date().toISOString(),
    };

    console.log("Visitor Info:", userInfo);

    // Save visitor data to logs.txt
    fs.appendFileSync("logs.txt", JSON.stringify(userInfo) + "\n");

    // Redirect user to the original destination
    res.redirect(destination);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
