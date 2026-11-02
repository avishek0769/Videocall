# MEDIASOUP & WEBRTC DEPLOYMENT AND TROUBLESHOOTING GUIDE

**Project:** Video_Record_Call (Live Video & Audio Calling via Mediasoup SFU)  
**Created for:** Future debugging reference across local development and production.

---

## 1. ARCHITECTURE OVERVIEW: SIGNALING vs. MEDIA (CRITICAL CONCEPT)

WebRTC applications have **TWO** independent network pipelines:

### A. Signaling (Socket.IO over TCP / HTTP / HTTPS)
* **Port:** Runs on Port 3000 (or 443 via Nginx/Caddy reverse proxy).
* **Role:** Handles room creation, join/leave events, exchanging RTP capabilities, transport parameters, and producer/consumer IDs.
* **Proxying:** Devtunnels, Cloudflare Tunnels, and standard reverse proxies **CAN** proxy this.

### B. Media Streams (Audio / Video RTP & RTCP over UDP & TCP)
* **Engine:** Handled directly by the Mediasoup C++ worker binary.
* **Ports:** Runs on the Port Range defined in `createWorker`: **2000 to 2120**.
* **Connectivity:** Requires **DIRECT IP** connectivity between the client browser and the server.
* **Proxying:** Devtunnels / standard HTTP proxies **CANNOT** forward UDP media traffic.

> **KEY TAKEAWAY:**  
> If users can join rooms and see join popups, but see black/frozen video and muted tracks, Signaling is **100% WORKING**, but the **MEDIA** pipeline (UDP 2000–2120) is **BLOCKED**.

---

## 2. SYMPTOMS & ROOT CAUSE MATRIX

### SYMPTOM 1
* **Console Output:**
  ```text
  [ICE] SendTransport connectionstatechange -> failed
  [ICE] RecvTransport connectionstatechange -> failed
  Track MediaStreamTrack { ... muted: true }
  ```
* **ROOT CAUSE:** Media packets (UDP 2000–2120) cannot reach the server.
  * Cloud Firewall (Oracle OCI / AWS / GCP) is dropping UDP/TCP 2000–2120.
  * Linux internal `iptables` has a `REJECT` rule blocking the ports.
  * `MEDIASOUP_ANNOUNCED_IP` in `.env` is wrong or set to a private IP.

### SYMPTOM 2
* **Console Output:** Logs coming from an old bundle (e.g., `index-CyuwcxpQ.js`) instead of the latest bundle.
* **ROOT CAUSE:**
  * `Server/dist/` was not rebuilt or not committed to git.
  * Browser cached the old bundle (solution: `Ctrl + Shift + R` hard refresh or push the `Server/dist/` and then cp to `Client/dist/` in prod server).

### SYMPTOM 3
* **Behavior:** Testing on Localhost works, but connecting 2 devices on different networks fails even with devtunnel.
* **ROOT CAUSE:**
  * Devtunnel only forwards port 3000 (TCP).
  * Remote device tries to send UDP to the LAN IP (`192.168.x.x`), which is not routable from outside your home network.
  * **Solution:** Test cross-network **ONLY** on the production server.

### SYMPTOM 4
* **Behavior:** Suddenly stopped working locally after working fine yesterday.
* **ROOT CAUSE:**
  * Your router DHCP reassigned your PC a new local IP (e.g., `192.168.1.37` -> `.35`).
  * Check current IP (`hostname -I | awk '{print $1}'`).
  * The server now auto-detects LAN IP via `getLanIp()`, but ensure `.env` does not have a hardcoded stale IP.

---

## 3. ORACLE CLOUD INFRASTRUCTURE (OCI) CHECKLIST (VITAL)

Oracle Cloud Ubuntu images have **TWO** independent firewalls that **BOTH** block WebRTC by default:

### STEP 1: Oracle Cloud Web Console (VCN Security List)
1. Log into [Oracle Cloud Console](https://cloud.oracle.com/).
2. Go to: **Networking** -> **Virtual Cloud Networks** -> Select your VCN.
3. Click **Security Lists** on the left menu -> Click **Default Security List**.
4. Click **Add Ingress Rules**:
   * **Source CIDR:** `0.0.0.0/0`
   * **IP Protocol:** `UDP`
   * **Destination Port Range:** `2000-2120`
5. Click **Add Ingress Rules** again:
   * **Source CIDR:** `0.0.0.0/0`
   * **IP Protocol:** `TCP`
   * **Destination Port Range:** `2000-2120`

### STEP 2: Ubuntu OS Internal `iptables` (Inside the VM)
Oracle's Ubuntu images contain a default rule:
`-A INPUT -j REJECT --reject-with icmp-host-prohibited`

Standard `ufw allow` commands **DO NOT OVERRIDE** this rule. You **MUST** run these commands inside the VPS:

```bash
# 1. Insert allow rules at rule #1 (above the REJECT rule):
sudo iptables -I INPUT 1 -p udp --dport 2000:2120 -j ACCEPT
sudo iptables -I INPUT 1 -p tcp --dport 2000:2120 -j ACCEPT

# 2. Persist the rules across VM reboot:
sudo iptables-save | sudo tee /etc/iptables/rules.v4

# 3. If netfilter-persistent is installed:
sudo netfilter-persistent save
sudo netfilter-persistent reload
```

---

## 4. ENVIRONMENT CONFIGURATION (`Server/.env`)

On Production Server (`/home/videocall/Server/.env`):

```env
PORT=3000
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=<YOUR_SERVER_PUBLIC_IP>
TWILIO_ACCOUNT_SID=ACd...
TWILIO_AUTH_TOKEN=e96b...
```

**Notes:**
* To find your server public IP: `curl https://api.ipify.org`
* Do **NOT** leave `MEDIASOUP_ANNOUNCED_IP` blank on production! If left blank, it will fall back to the internal VPC private IP (e.g., `10.0.0.x`), which clients on the internet cannot reach.

---

## 5. FRONTEND BUILD & DEPLOYMENT WORKFLOW

`Server/index.js` serves static files from `Server/dist`.  
`Client/vite.config.js` is configured to build directly into `Server/dist`.

When making any frontend changes in `Client/src`:

### Step 1 (Local)
```bash
cd Client
npm run build
```

### Step 2 (Local)
```bash
git add .
git commit -m "Your update message"
git push origin main
```

### Step 3 (Production Server)
```bash
cd /home/videocall
git pull
cd Server
node index.js
```

### Step 4 (Browser)
Always perform a **HARD REFRESH**:
* **Windows/Linux:** `Ctrl + Shift + R`
* **Mac:** `Cmd + Shift + R`  
Check that the script loaded in DevTools matches the newly generated hash (e.g., `index-BIEpD03q.js`).

---

## 6. QUICK DIAGNOSTIC CHECKS & COMMANDS

### A. Run the built-in diagnostic script on the server
```bash
cd /home/videocall/Server
node diagnose.js
```
**Checks performed:**
* Network interfaces
* Announced IP vs. Public IP alignment
* UDP socket bind test on port 2001
* Twilio TURN credential generation

### B. Test if port 2000 TCP/UDP is reachable from your local machine
```bash
nc -z -v -w3 <SERVER_PUBLIC_IP> 2000
nc -z -v -w3 <SERVER_PUBLIC_IP> 443
```
* **If it returns `No route to host`:**  
  -> Oracle Cloud `iptables` REJECT rule is active (see Section 3, Step 2).
* **If it returns `timed out`:**  
  -> Cloud provider Security Group / Security List is dropping the packets (see Section 3, Step 1).
* **If it returns `succeeded`:**  
  -> The port is open and reachable!

### C. Chrome WebRTC Internals
While in a call, open a new tab and navigate to:  
`chrome://webrtc-internals`

Inspect the active `PeerConnection`:
* Look at `iceConnectionState`: should be `connected` or `completed`.
* Look at `bytesReceived` / `bytesSent` graphs: should be continuously climbing.

---

## 7. MEDIASOUP-WORKER NATIVE BINARY

If you deploy to a new Linux server and encounter:  
`Error: spawn .../mediasoup-worker ENOENT`

Mediasoup requires its native C++ worker to be compiled for the target OS CPU:

```bash
sudo apt-get update && sudo apt-get install -y python3 build-essential
cd /home/videocall/Server
npm explore mediasoup -- npm run worker:build
node index.js
```