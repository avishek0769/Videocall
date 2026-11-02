import React, { useCallback, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SocketContext } from '../../context/SocketProvider'
import { RadioIcon, VideoIcon, SparklesIcon } from '../../components/Icons'

function LiveLobby() {
    const [roomId, setRoomId] = useState("")
    const socket = useContext(SocketContext)
    const navigate = useNavigate()

    const handleJoin = useCallback(()=>{
        if (!roomId.trim()) return
        socket.emit("join-user", { roomId: roomId.trim() })
        navigate(`/live/room/${roomId.trim()}`)
    }, [roomId, socket, navigate])

    const generateRandomRoom = () => {
        const randomId = Math.random().toString(36).substring(2, 8)
        setRoomId(randomId)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && roomId.trim()) {
            handleJoin()
        }
    }
    
    return (
        <div className="w-full">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8">
                <div className="mb-6">
                    <div className="flex items-center gap-2 text-zinc-300 mb-3">
                        <div className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700">
                            <RadioIcon className="w-4 h-4 text-zinc-300" />
                        </div>
                        <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400">
                            Live Room
                        </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        Start or Join a Call
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                        Enter any room name to create a space, or join a call in progress.
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label htmlFor="roomId" className="text-xs font-medium uppercase tracking-wider text-zinc-300">
                                Room Identifier
                            </label>
                            <button
                                type="button"
                                onClick={generateRandomRoom}
                                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                            >
                                <SparklesIcon className="w-3 h-3" />
                                <span>Generate random</span>
                            </button>
                        </div>

                        <div className="relative">
                            <input 
                                type="text" 
                                id="roomId" 
                                name="roomId" 
                                className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors font-mono" 
                                value={roomId} 
                                onChange={e => setRoomId(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="e.g. design-sync-12"
                                autoFocus
                            />
                        </div>
                    </div>

                    <button 
                        className={`w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl transition-colors cursor-pointer ${
                            roomId.trim() 
                                ? "bg-white text-zinc-950 hover:bg-zinc-200" 
                                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        }`}
                        onClick={handleJoin}
                        disabled={!roomId.trim()}
                    >
                        <VideoIcon className="w-4 h-4" />
                        <span>Enter Live Room</span>
                    </button>
                </div>

                {/* Footer hints */}
                <div className="mt-6 pt-5 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                        No account required
                    </span>
                    <span>Group WebRTC Call</span>
                </div>
            </div>
        </div>
    );
}

export default LiveLobby
