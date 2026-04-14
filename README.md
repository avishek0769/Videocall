# Video Record Call (mediasoup)

A real-time video communication app with two modes:

- Live Mode: real-time two-way audio/video call using mediasoup SFU.
- Recording Mode: short video message exchange (record -> chunk stream -> playback).

No login is required. Users join by sharing a room ID.

## Current Capability

- Room-based joining with shared room ID.
- No authentication.
- Live Mode supports group calling (multiple participants in the same room).
- Recording Mode is also 1-to-1 session based.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, socket.io-client, mediasoup-client.
- Backend: Node.js, Express, socket.io, mediasoup.
- Transport: WebRTC media + Socket.IO signaling.

## Repository Structure

```text
Video_Record_Call/
	Client/                # React + Vite frontend
	Server/                # Express + Socket.IO + mediasoup backend
	constants.js           # Shared client/server addresses
	ssl/                   # Optional SSL cert/key (currently commented)
	README.md
```

## How It Works

### 1) Room and Signaling Model

- A user enters a room ID in Live or Record lobby.
- Client emits join events to server.
- Server keeps in-memory room/peer state:
	- `rooms`: room -> router + peer socket IDs
	- `peers`: socket -> transports/producers/consumers
	- `transports`, `producers`, `consumers`: flat arrays for lookup/cleanup

### 2) Live Mode (mediasoup SFU flow)

On backend startup:

- Creates one mediasoup worker with RTP port range `2000-2120`.
- Creates routers per room (lazily, on first join).

Live call sequence:

1. Client joins room (`joinRoom`) and receives router RTP capabilities.
2. Client creates mediasoup `Device` from those capabilities.
3. Client asks server for send transport (`createWebRTCTransport`, `consumer: false`).
4. Client connects send transport (`producerTransport-connect`).
5. Client produces local audio and video (`producerTransport-produce`) as separate producers.
6. Server informs other peers with `new-producer`.
7. Other peers create recv transport (`consumer: true`), connect, and consume (`consumerTransport-consume`).
8. Client resumes consumer (`consumer-resume`) and renders remote stream.

Cleanup:

- On `disconnect`, server removes all transports/producers/consumers for that socket.
- If room becomes empty, room is deleted.

### 3) Recording Mode (chunked stream relay)

- Sender records local stream via `MediaRecorder`.
- Recorded chunks are emitted to server (`streamData1-record:server`).
- Server forwards chunks to target peer (`streamData1-record:client`).
- Receiver accumulates chunks and plays a generated Blob URL when final chunk arrives.
- No file persistence/database storage is used.

## Backend Endpoints

- `GET /` -> serves SPA index from `Server/dist`.
- `GET /live` -> serves SPA index.
- `GET /record` -> serves SPA index.
- `GET /states` -> debug JSON with current mediasoup object counts and IDs.

## Socket Events

### Recording Mode Events

- `join-user-record`
- `user-joined-record`
- `user-joined-confirm-record:server`
- `user-joined-confirm-record:client`
- `streamData1-record:server`
- `streamData1-record:client`
- `end-call-record`
- `user-left-record`

### Live Mode + mediasoup Events

- `join-user`
- `user-joined`
- `user-joined-confirm:server`
- `user-joined-confirm:client`
- `joinRoom`
- `createWebRTCTransport`
- `producerTransport-connect`
- `producerTransport-produce`
- `new-producer`
- `getProducers`
- `consumerTransport-connect`
- `consumerTransport-consume`
- `consumer-resume`
- `producer-closed`

## Local Development Setup

### Prerequisites

- Node.js 18+ (recommended 20+)
- npm
- Camera/microphone permissions

### 1) Install Dependencies

```bash
cd Client && npm install
cd ../Server && npm install
```

### 2) Configure Addresses

Update `constants.js`:

- `SERVER_ADDRESS`: backend URL used by socket.io client.
- `CLIENT_ADDRESS`: allowed Socket.IO CORS origin.

For local testing example:

```js
export const SERVER_ADDRESS = "http://localhost:3000"
export const CLIENT_ADDRESS = "http://localhost:5173"
```

### 3) Configure Backend Environment

In `Server/.env` set at least:

- `PORT=3000`
- `MEDIASOUP_LISTEN_IP=0.0.0.0`
- `MEDIASOUP_ANNOUNCED_IP=<your-public-ip-or-host-ip>`

Important:

- If clients are on different networks/machines, `MEDIASOUP_ANNOUNCED_IP` must be reachable by them.
- If this is wrong, signaling can succeed but media may fail.

### 4) Run Frontend and Backend

Terminal 1:

```bash
cd Server
npm run dev
```

Terminal 2:

```bash
cd Client
npm run dev
```

Open `http://localhost:5173`.

## Production Build (Single Origin via Backend)

Backend serves static files from `Server/dist`.

Build frontend and copy artifacts to backend dist:

```bash
cd Client
npm run build

cd ..
rm -rf Server/dist
cp -r Client/dist Server/dist
```

Then run backend:

```bash
cd Server
node index.js
```

App will be served from backend root routes (`/`, `/live`, `/record`).

## Networking Notes (mediasoup)

- Signaling port: `3000` (or configured server port).
- RTP/RTCP port range: `2000-2120` (UDP/TCP as configured).
- Ensure firewall/security group allows the mediasoup RTP port range.

## Security Notes

- No auth/authorization layer exists currently.
- Room IDs are guessable by design in current implementation.
- Do not commit real secrets/tokens to source control.

## Known Limitations

- Live mode can run group calls, but room quality depends on client/network capacity.
- In-memory room state only (no persistence/recovery after server restart).
- `constants.js` uses hard-coded URLs (manual env-based config not yet wired).
- HTTPS server setup is present but commented out.

## Debugging Tips

- Check `GET /states` to inspect active transports/producers/consumers.
- If video does not flow but socket events do, verify:
	- `MEDIASOUP_ANNOUNCED_IP`
	- Open RTP port range `2000-2120`
	- Browser camera/mic permissions
- If client cannot connect to socket, verify `SERVER_ADDRESS` and `CLIENT_ADDRESS` match running origins.

## Scripts

Client (`Client/package.json`):

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

Server (`Server/package.json`):

- `npm run dev` (Node watch mode)

## Future Improvements

- Better UX and controls for large group calls (participant list, active speaker, moderation).
- Authentication and room access controls.
- Persisted recording storage (S3/local/object storage).
- Env-based runtime config instead of hard-coded `constants.js` URLs.
- TURN/STUN hardening for stricter NAT environments.