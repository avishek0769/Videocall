import { createContext, useMemo } from "react";
import { io } from "socket.io-client"
import { SERVER_ADDRESS } from "../../../constants.js";

export const SocketContext = createContext(null)

function SocketProvider({children}) {
    const socket = useMemo(() => {
        // If loaded directly from production domain/IP, connect to current origin; else use SERVER_ADDRESS
        const isDevTunnel = window.location.hostname.includes("devtunnels.ms");
        const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        const socketUrl = (isDevTunnel || isLocalhost) ? SERVER_ADDRESS : (window.location.origin || SERVER_ADDRESS);
        console.log("[Socket] Connecting to:", socketUrl);
        return io(socketUrl);
    }, [])
    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    )
}

export default SocketProvider
