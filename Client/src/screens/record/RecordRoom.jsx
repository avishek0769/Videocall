import React, { useContext, useEffect, useRef, useState, useCallback } from 'react'
import { SocketContext } from '../../context/SocketProvider';
import { useParams, useNavigate } from 'react-router-dom';
import { FilmIcon, RecordDotIcon, StopCircleIcon, PhoneOffIcon, ArrowLeftIcon, UserIcon, CloseIcon, VideoIcon } from '../../components/Icons';

function RecordRoom() {
    const mediaRecorderRef = useRef(null);
    const [myStream, setMySetstream] = useState()
    const [state, setState] = useState(null)
    const [remoteSocketId, setRemoteSocketId] = useState(null)
    const [recordingDuration, setRecordingDuration] = useState(0)
    const [cooldownTime, setCooldownTime] = useState(0)
    const [showUserLeftPopup, setShowUserLeftPopup] = useState(false)
    const videoRef = useRef(null)
    const nextUserRef = useRef(null)
    const recordingTimerRef = useRef(null)
    const cooldownTimerRef = useRef(null)
    const socket = useContext(SocketContext)
    const { roomId } = useParams()
    const navigate = useNavigate()

    const handleUserJoined = useCallback(({ socketId }) => {
        setRemoteSocketId(socketId)
        console.log(`User with this socket ID, ${socketId} just joined !`)
        socket.emit("user-joined-confirm-record:server", { user2Id: socketId, socketId: socket.id })
    })

    const handleUserJoinedConfirm = useCallback((socketId) => {
        setRemoteSocketId(socketId)
        console.log(`User with this socket ID, ${socketId} was waiting !`)
    }, [])

    const handleCall = useCallback(() => {
        setState("recording")
        setRecordingDuration(0)
        
        // Start recording timer
        recordingTimerRef.current = setInterval(() => {
            setRecordingDuration(prev => prev + 1)
        }, 1000)

        mediaRecorderRef.current = new MediaRecorder(myStream, {
            mimeType: 'video/webm; codecs="vp8,opus"',
            audioBitsPerSecond: 128000,
            videoBitsPerSecond: 2500000,
        });

        mediaRecorderRef.current.ondataavailable = (ev) => {
            socket.emit("streamData1-record:server", {
                streamData: ev.data,
                sendTo: remoteSocketId,
            });
        };

        // Detect when recording stops
        mediaRecorderRef.current.onstop = () => {
            socket.emit("streamData1-record:server", {
                streamData: new Blob([], { type: "video/webm" }), // Empty final chunk
                sendTo: remoteSocketId,
                isLastChunk: true,
            });
        };

        mediaRecorderRef.current.start(500);
    }, [socket, myStream, remoteSocketId]);

    const receivedChunks = useRef([]);
    const handleReceivingStream = useCallback((chunk) => {
        console.log(chunk);
        receivedChunks.current.push(chunk.streamData);

        if (chunk.isLastChunk) {
            const combinedBlob = new Blob(receivedChunks.current, {
                type: "video/webm"
            });
            const videoUrl = URL.createObjectURL(combinedBlob);

            if (nextUserRef.current) {
                nextUserRef.current.src = videoUrl;
                nextUserRef.current.play().catch(console.error);
            }
            receivedChunks.current = [];
        }
    }, []);

    const handleStopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
            
            // Clear recording timer
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current)
                recordingTimerRef.current = null
            }

            setState("sent")
            
            // Start cooldown timer with the recorded duration
            setCooldownTime(recordingDuration + 1)
            cooldownTimerRef.current = setInterval(() => {
                setCooldownTime(prev => {
                    if (prev <= 0) {
                        clearInterval(cooldownTimerRef.current)
                        cooldownTimerRef.current = null
                        setState(null)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }
    }, [recordingDuration]);

    const handleEndCall = useCallback(() => {
        socket.emit("end-call-record", { to: remoteSocketId });
        // Clear all timers
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current)
            recordingTimerRef.current = null
        }
        if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current)
            cooldownTimerRef.current = null
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
        }
        if (myStream) {
            myStream.getTracks().forEach(track => track.stop())
        }
        setMySetstream(null)
        setRemoteSocketId(null)
        setState(null)
        setRecordingDuration(0)
        setCooldownTime(0)
        navigate("/record")
    }, [myStream, navigate, remoteSocketId]);

    const handleUserLeft = useCallback(() => {
        console.log("User left the recording session")
        setRemoteSocketId(null)
        setState(null)
        setRecordingDuration(0)
        setCooldownTime(0)
        setShowUserLeftPopup(true)
        nextUserRef.current.src = "";

        // Clear all timers
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current)
            recordingTimerRef.current = null
        }
        if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current)
            cooldownTimerRef.current = null
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
        }

        // Auto-hide popup after 3 seconds
        setTimeout(() => {
            setShowUserLeftPopup(false)
        }, 3000)
    }, [])

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current)
            }
            if (cooldownTimerRef.current) {
                clearInterval(cooldownTimerRef.current)
            }
        }
    }, [])

    // Format time helper
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((stream) => {
                if (videoRef.current) {
                    setMySetstream(stream)
                    videoRef.current.srcObject = stream;
                }
            })
        console.log("Now-->", socket.id);
    }, [])

    useEffect(() => {
        socket.on("user-joined-record", handleUserJoined)
        socket.on("user-joined-confirm-record:client", handleUserJoinedConfirm)
        socket.on("streamData1-record:client", handleReceivingStream)
        socket.on("user-left-record", handleUserLeft);

        return () => {
            socket.off("user-joined-record", handleUserJoined)
            socket.off("user-joined-confirm-record:client", handleUserJoinedConfirm)
            socket.off("streamData1-record:client", handleReceivingStream)
            socket.off("user-left-record", handleUserLeft);
        }
    }, [socket, handleUserJoined, handleUserJoinedConfirm, handleReceivingStream, handleUserLeft])

    return (
        <div className="h-[100dvh] max-h-[100dvh] bg-slate-950 text-slate-100 font-sans flex flex-col justify-between overflow-hidden selection:bg-blue-500/30 selection:text-blue-200">
            {/* User Left Popup Notification */}
            {showUserLeftPopup && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] animate-bounce px-3 w-full max-w-sm">
                    <div className="bg-slate-900/95 border border-rose-500/30 rounded-2xl px-4 py-3 backdrop-blur-xl shadow-2xl shadow-rose-950/40 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                                <UserIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-xs sm:text-sm font-semibold text-white">Participant Left</h3>
                                <p className="text-slate-400 text-[11px] sm:text-xs">The other participant left the walkie session.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowUserLeftPopup(false)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Top Bar */}
            <header className="px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl flex-shrink-0 z-40">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Brand & Room Info */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                            <FilmIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight">PulseCall Walkie</h1>
                            <span className="text-slate-600">/</span>
                            <span className="font-mono text-[11px] sm:text-xs text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded-md border border-slate-800 max-w-[120px] sm:max-w-none truncate">
                                {roomId}
                            </span>
                        </div>
                    </div>

                    {/* Connection Status Badge */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] sm:text-xs font-medium">
                            {state === "recording" ? (
                                <>
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                    <span className="text-rose-400">Recording</span>
                                </>
                            ) : state === "sent" ? (
                                <>
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400"></span>
                                    <span className="text-emerald-400">Sent</span>
                                </>
                            ) : remoteSocketId ? (
                                <>
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    <span className="text-emerald-400">Connected</span>
                                </>
                            ) : (
                                <>
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-500"></span>
                                    <span className="text-slate-400">Standby</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Video Streams Container */}
            <main className="flex-1 min-h-0 p-2 sm:p-4 pb-20 sm:pb-24 max-w-7xl mx-auto w-full flex items-center justify-center">
                <div className="w-full h-full grid grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1 gap-2 sm:gap-4 min-h-0">
                    
                    {/* My Local Video Feed */}
                    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900/80 border border-slate-800/90 shadow-2xl shadow-blue-950/10 flex items-center justify-center h-full min-h-0 w-full">
                        <video 
                            ref={videoRef} 
                            muted 
                            autoPlay 
                            playsInline
                            className="w-full h-full object-cover -scale-x-100"
                        />
                        
                        {/* Video Label Badge */}
                        <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-950/70 border border-slate-800/80 backdrop-blur-md">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400"></div>
                            <span className="text-[11px] sm:text-xs font-semibold text-white tracking-wide">You</span>
                        </div>

                        {/* Live Recording Overlay Badge */}
                        {state === "recording" && (
                            <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/40 backdrop-blur-md">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-rose-300">REC</span>
                                <span className="font-mono text-[11px] sm:text-xs font-bold text-white">{formatTime(recordingDuration)}</span>
                            </div>
                        )}
                    </div>

                    {/* Remote Video Feed (Asynchronous Received Video) */}
                    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900/80 border border-slate-800/90 shadow-2xl shadow-blue-950/10 flex items-center justify-center h-full min-h-0 w-full">
                        <video 
                            ref={nextUserRef}
                            autoPlay 
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        
                        {!remoteSocketId && (
                            <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
                                <div className="max-w-xs space-y-2 sm:space-y-3">
                                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mx-auto text-slate-400">
                                        <UserIcon className="w-5 h-5 sm:w-7 sm:h-7" />
                                    </div>
                                    <h4 className="text-xs sm:text-sm font-semibold text-slate-300">
                                        Waiting for participant...
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-slate-500">
                                        Share room ID <span className="font-mono text-blue-400 font-semibold">{roomId}</span> to begin walkie messages.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Remote Video Label */}
                        {remoteSocketId && (
                            <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-950/70 border border-slate-800/80 backdrop-blur-md">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-400 animate-pulse"></div>
                                <span className="text-[11px] sm:text-xs font-semibold text-white tracking-wide">Participant</span>
                            </div>
                        )}
                    </div>

                </div>
            </main>

            {/* Floating Control Dock */}
            <div className="fixed bottom-3 sm:bottom-6 left-0 right-0 z-50 flex flex-col items-center pointer-events-none px-3 sm:px-4">
                
                {/* Floating Status Notification */}
                <div className="mb-2 sm:mb-3 pointer-events-auto">
                    <p className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-slate-900/90 border border-slate-800 backdrop-blur-md text-[11px] sm:text-xs font-medium text-slate-300 shadow-lg text-center max-w-[90vw] truncate">
                        {!remoteSocketId ? "Waiting for participant to join room..." : null}
                        {(remoteSocketId && state === undefined) ? "Recording ready to transmit." : null}
                        {(remoteSocketId && state === "recording") ? "Recording dispatch in progress..." : null}
                        {(remoteSocketId && state === "sent") ? `Recording transmitted. Cooldown: ${formatTime(cooldownTime)}` : null}
                        {(remoteSocketId && state === null) ? "Participant connected. Ready to record." : null}
                    </p>
                </div>

                {/* Main Action Dock */}
                <div className="pointer-events-auto bg-slate-900/90 border border-slate-800/90 backdrop-blur-2xl px-4 py-2 sm:px-5 sm:py-2.5 rounded-full shadow-2xl shadow-black/80 flex items-center gap-2 sm:gap-3">
                    
                    {/* Record / Transmit Button */}
                    {remoteSocketId && state !== "recording" && (
                        <button
                            onClick={handleCall}
                            disabled={cooldownTime > 0}
                            className={`flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-full shadow-lg transition-all duration-200 cursor-pointer ${
                                cooldownTime > 0 
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none' 
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95'
                            }`}
                        >
                            <RecordDotIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-400" />
                            <span>
                                {cooldownTime > 0 ? `Cooldown (${formatTime(cooldownTime)})` : 'Hold to Record'}
                            </span>
                        </button>
                    )}

                    {/* Stop Recording Button */}
                    {state === "recording" && (
                        <button
                            onClick={handleStopRecording}
                            className="flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-semibold rounded-full shadow-lg shadow-rose-600/30 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                        >
                            <StopCircleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>Send Dispatch</span>
                        </button>
                    )}

                    {/* End Session Button */}
                    {remoteSocketId ? (
                        <button
                            onClick={handleEndCall}
                            className="flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-semibold rounded-full shadow-lg shadow-rose-600/30 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                        >
                            <PhoneOffIcon className="w-4 h-4" />
                            <span>Leave Room</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleEndCall}
                            className="flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:px-4 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 cursor-pointer"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                            <span>Exit Lobby</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default RecordRoom