import React, { useCallback, useContext, useState } from 'react'
import { SocketContext } from '../../context/SocketProvider'
import { useNavigate } from 'react-router-dom'
import { FilmIcon, SparklesIcon, RadioIcon } from '../../components/Icons'

function RecordLobby() {
    const [roomId, setRoomId] = useState("")
    const socket = useContext(SocketContext)
    const navigate = useNavigate()

    const handleJoin = useCallback(()=>{
        if (!roomId.trim()) return
        socket.emit("join-user-record", { roomId: roomId.trim() })
        navigate(`/record/room/${roomId.trim()}`)
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
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-blue-950/20 relative overflow-hidden">
                {/* Glow accent */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>

                <div className="mb-6">
                    <div className="flex items-center gap-2.5 text-blue-400 mb-2">
                        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <FilmIcon className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-xs uppercase tracking-widest font-bold text-blue-400">
                            Walkie Session
                        </span>
                    </div>

                    <h3 className="text-2xl font-bold text-white tracking-tight">
                        Start Video Walkie
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                        Record and push short video dispatches back and forth like a video walkie-talkie.
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label htmlFor="roomId" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                                Room Identifier
                            </label>
                            <button
                                type="button"
                                onClick={generateRandomRoom}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
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
                                className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono" 
                                value={roomId} 
                                onChange={e => setRoomId(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="e.g. async-update-44"
                                autoFocus
                            />
                        </div>
                    </div>

                    <button 
                        className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer shadow-lg ${
                            roomId.trim() 
                                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99]" 
                                : "bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"
                        }`}
                        onClick={handleJoin}
                        disabled={!roomId.trim()}
                    >
                        <FilmIcon className="w-4 h-4" />
                        <span>Enter Walkie Room</span>
                    </button>
                </div>

                {/* Footer hints */}
                <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        Asynchronous video chat
                    </span>
                    <span>No Storage Required</span>
                </div>
            </div>
        </div>
    );
}

export default RecordLobby
