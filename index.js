#!/usr/bin/env node
const { program } = require("commander");
const os = require("os");
const https = require("https");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// User local storage path
const userDataDir = path.join(os.homedir(), ".sohag-cli");
const userPortsFile = path.join(userDataDir, "ports-list.json");

// Ensure user ports file exists
function ensureUserPortsFile() {
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  if (!fs.existsSync(userPortsFile)) {
    const defaultPorts = [
      { name: "App1", port: "3000", url: "http://localhost:3000" },
      { name: "App2", port: "8080", url: "http://localhost:8080" },
      { name: "App3", port: "5000", url: "http://localhost:5000" },
    ];
    fs.writeFileSync(
      userPortsFile,
      JSON.stringify(defaultPorts, null, 2),
      "utf8"
    );
  }
}

// 🟢 Get local IP + MAC
function getLocalNetworkInfo() {
  const nets = os.networkInterfaces();
  let results = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        results.push({
          interface: name,
          ip: net.address,
          mac: net.mac,
        });
      }
    }
  }
  return results;
}

// 🟢 Get public IP
function getPublicIP() {
  return new Promise((resolve, reject) => {
    https
      .get("https://api.ipify.org?format=json", (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json.ip);
          } catch (err) {
            reject("Error parsing response");
          }
        });
      })
      .on("error", (err) => reject(err.message));
  });
}

// 🟢 Get running ports (parsed)
function getRunningPorts() {
  return new Promise((resolve, reject) => {
    let cmd;

    if (process.platform === "win32") {
      cmd = "netstat -ano"; // Windows
    } else {
      cmd = "lsof -i -P -n | grep LISTEN"; // Linux/macOS
    }

    exec(cmd, (err, stdout, stderr) => {
      if (err || stderr) {
        reject(err || stderr);
      } else {
        const lines = stdout.trim().split("\n");
        let results = [];

        if (process.platform === "win32") {
          lines.forEach((line) => {
            line = line.trim().split(/\s+/);
            if (line[0] === "TCP" || line[0] === "UDP") {
              const protocol = line[0];
              const localAddress = line[1];
              const pid = line[line.length - 1];
              const port = localAddress.split(":").pop();
              results.push({ protocol, port, pid });
            }
          });
        } else {
          lines.forEach((line) => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 9) {
              const process = parts[0];
              const pid = parts[1];
              const protocol = parts[7];
              const name = parts[8];
              const port = name.split(":").pop();
              results.push({ process, pid, protocol, port });
            }
          });
        }

        resolve(results);
      }
    });
  });
}

// Ensure the user ports file exists before running commands
ensureUserPortsFile();

program
  .name("sohag-cli")
  .description("CLI app to show network info and check ports")
  .version("1.0.0");

// 🟢 ip command
program
  .command("ip")
  .description("Show local IP, MAC address, and public IP")
  .action(async () => {
    const localInfo = getLocalNetworkInfo();

    if (localInfo.length > 0) {
      console.log("Local Network Info:");
      localInfo.forEach((net) => {
        console.log(` - Interface: ${net.interface}`);
        console.log(`   IP:  ${net.ip}`);
        console.log(`   MAC: ${net.mac}\n`);
      });
    } else {
      console.log("No local network info found.");
    }

    try {
      const publicIP = await getPublicIP();
      console.log("Public IP address:");
      console.log(" - " + publicIP);
    } catch (err) {
      console.error("\nCould not fetch public IP:", err);
    }
  });

// 🟢 ports command
program
  .command("ports")
  .description("Check apps in ports-list.json and show their status")
  .action(async () => {
    let customPorts = [];
    try {
      customPorts = JSON.parse(fs.readFileSync(userPortsFile, "utf8"));
    } catch (err) {
      console.error("Could not read user ports file:", err);
      return;
    }

    let runningPorts = [];
    try {
      runningPorts = await getRunningPorts();
    } catch (err) {
      console.error("Error fetching running ports:", err);
      return;
    }

    // Only TCP ports
    const tcpPorts = runningPorts.filter(
      (p) => p.protocol && p.protocol.toUpperCase().includes("TCP")
    );

    // Check status
    const results = customPorts.map((entry) => {
      const found = tcpPorts.find((p) => p.port === entry.port);
      return {
        name: entry.name,
        port: Number(entry.port),
        status: found ? "Active" : "Inactive",
        pid: found ? found.pid : "-",
        url: entry.url || "-",
      };
    });

    // Manual table output
    const headers = ["SL", "Name", "Port", "Status", "PID", "URL"];
    const colWidths = [6, 15, 8, 10, 8, 30];

    // Print header
    console.log(headers.map((h, i) => h.padEnd(colWidths[i])).join(" | "));
    console.log("-".repeat(colWidths.reduce((a, b) => a + b + 3, -3)));
    const red = "\x1b[31m";
    const reset = "\x1b[0m";
    results.forEach((row, index) => {
      const statusText =
        row.status === "Inactive"
          ? red + String(row.status).padEnd(colWidths[3]) + reset
          : String(row.status).padEnd(colWidths[3]);
      console.log(
        String(index + 1).padEnd(colWidths[0]) +
          " | " +
          String(row.name).padEnd(colWidths[1]) +
          " | " +
          String(row.port).padEnd(colWidths[2]) +
          " | " +
          statusText +
          " | " +
          String(row.pid).padEnd(colWidths[4]) +
          " | " +
          String(row.url).padEnd(colWidths[5])
      );
    });
    console.log("\n");
  });

// 🟢 ports-edit command
program
  .command("ports-edit")
  .description("Edit your local ports-list.json")
  .action(() => {
    const editor =
      process.env.EDITOR || (process.platform === "win32" ? "notepad" : "nano");
    exec(`${editor} "${userPortsFile}"`);
  });

program.parse(process.argv);
