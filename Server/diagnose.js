/**
 * Run this on the production server to diagnose WebRTC media issues:
 *   node diagnose.js
 */
import "dotenv/config"
import os from "os"
import dgram from "dgram"

console.log("\n=== WebRTC Media Connectivity Diagnostics ===\n")

// 1. Network interfaces
console.log("1. Network Interfaces:")
const ifaces = os.networkInterfaces()
for (const [name, addrs] of Object.entries(ifaces)) {
    for (const addr of addrs) {
        if (addr.family === "IPv4") {
            console.log(`   ${name}: ${addr.address} (${addr.internal ? "loopback" : "external"})`)
        }
    }
}

// 2. Env check
console.log("\n2. Environment:")
console.log("   PORT:", process.env.PORT || "(not set)")
console.log("   MEDIASOUP_LISTEN_IP:", process.env.MEDIASOUP_LISTEN_IP || "(not set — defaults to 0.0.0.0)")
console.log("   MEDIASOUP_ANNOUNCED_IP:", process.env.MEDIASOUP_ANNOUNCED_IP || "⚠️  NOT SET — server will use LAN IP, remote clients cannot reach it")
console.log("   TWILIO_ACCOUNT_SID:", process.env.TWILIO_ACCOUNT_SID ? `ACd...${process.env.TWILIO_ACCOUNT_SID.slice(-4)}` : "⚠️  NOT SET")
console.log("   TWILIO_AUTH_TOKEN:", process.env.TWILIO_AUTH_TOKEN ? "(set)" : "⚠️  NOT SET")

// 3. Test UDP listener on a port in the mediasoup range
console.log("\n3. UDP Port Test (port 2001):")
const server = dgram.createSocket("udp4")
server.on("error", (err) => {
    console.log("   ❌ Cannot bind UDP 2001:", err.message)
    server.close()
})
server.on("listening", () => {
    const addr = server.address()
    console.log(`   ✅ UDP listener bound on ${addr.address}:${addr.port}`)
    console.log("      (This means the OS allows UDP on this port)")
    console.log("      If clients still can't connect, it's the CLOUD FIREWALL blocking external UDP")
    server.close()
})
server.bind(2001, "0.0.0.0")

// 4. Twilio TURN test
console.log("\n4. Twilio TURN Credentials Test:")
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    import("twilio").then(({ default: twilio }) => {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        client.tokens.create().then(token => {
            console.log("   ✅ Twilio TURN credentials fetched successfully!")
            console.log("   ICE servers:")
            token.iceServers.forEach(s => console.log("     -", s.url || s.urls))
        }).catch(err => {
            console.log("   ❌ Twilio TURN fetch FAILED:", err.message)
            console.log("      TURN relay won't work — check your Twilio credentials")
        })
    })
} else {
    console.log("   ❌ Twilio credentials not set — TURN relay disabled")
}

// 5. Public IP detection
console.log("\n5. Public IP:")
import("https").then(({ default: https }) => {
    https.get("https://api.ipify.org", (res) => {
        let data = ""
        res.on("data", chunk => data += chunk)
        res.on("end", () => {
            const publicIp = data.trim()
            const announcedIp = process.env.MEDIASOUP_ANNOUNCED_IP
            console.log("   Detected public IP:", publicIp)
            if (!announcedIp) {
                console.log("   ❌ MEDIASOUP_ANNOUNCED_IP is not set — must be set to", publicIp)
            } else if (announcedIp !== publicIp) {
                console.log("   ⚠️  MEDIASOUP_ANNOUNCED_IP =", announcedIp, "but public IP is", publicIp)
                console.log("      Update .env: MEDIASOUP_ANNOUNCED_IP=" + publicIp)
            } else {
                console.log("   ✅ MEDIASOUP_ANNOUNCED_IP matches public IP")
            }
            console.log("\n=== Done ===\n")
        })
    }).on("error", () => {
        console.log("   (Could not fetch public IP — no outbound HTTPS)")
        console.log("\n=== Done ===\n")
    })
})
