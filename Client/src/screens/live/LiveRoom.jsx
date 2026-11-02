import React, { useContext, useEffect, useRef, useState, useCallback } from 'react'
import ReactPlayer from "react-player"
import { useNavigate, useParams } from 'react-router-dom'
import { SocketContext } from '../../context/SocketProvider'
import * as mediasoupClient from "mediasoup-client"
import { RadioIcon, PhoneOffIcon, VolumeIcon, VolumeXIcon, UserIcon, UsersIcon, ArrowLeftIcon, CloseIcon, VideoIcon, ActivityIcon, CheckIcon } from '../../components/Icons'

function LiveRoom() {
    const [myStream, setMyStream] = useState()
    const [isConnected, setIsConnected] = useState(null)
    const [remoteStream, setRemoteStream] = useState([])
    const [remoteSocketId, setRemoteSocketId] = useState(null)
    const [showUserLeftPopup, setShowUserLeftPopup] = useState(false)
    const [device, setDevice] = useState()
    const [rtpCapabilities, setRtpCapabilities] = useState()
    const [producerTransport, setProducerTransport] = useState()
    const [audioTransporter, setAudioTransporter] = useState()
    const [videoTransporter, setVideoTransporter] = useState()
    const [removeStream, setRemoveStream] = useState(false)
    const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true)
    const pendingVideoTracksRef = useRef({})
    const pendingAudioTracksRef = useRef({})
    const consumedProducerIdsRef = useRef(new Set()) // prevents duplicate consumers
    const socket = useContext(SocketContext)
    const navigate = useNavigate()
    const producerTransRef = useRef(false)
    const isSendTransportConnectedRef = useRef(false)
    const roomJoinedRef = useRef(false)
    const producersGot = useRef(false)
    const deviceRef = useRef(null)
    const consumerTransportRef = useRef([])
    const producerTransportRef = useRef([])
    // const params = {
    //     encodings: [
    //         {
    //             rid: 'r0',
    //             maxBitrate: 100000,
    //         },
    //         {
    //             rid: 'r1',
    //             maxBitrate: 300000,
    //         },
    //         {
    //             rid: 'r2',
    //             maxBitrate: 900000,
    //         },
    //     ],
    //     codecOptions: {
    //         videoGoogleStartBitrate: 1000
    //     }
    // }
    const { roomId } = useParams()

    const handleUserJoined = useCallback(({ socketId }) => {
        setRemoteSocketId(socketId)
        // console.log(`User ${socketId} joined !`)
        socket.emit("user-joined-confirm:server", { user2Id: socketId, socketId: socket.id })
    }, [setRemoteSocketId])

    const handleUserJoinedConfirm = useCallback((socketId) => {
        setRemoteSocketId(socketId)
        console.log(`User ${socketId} was waiting !`)
    }, [setRemoteSocketId])

    let i = 0;
    const getProducers = () => {
        socket.emit("getProducers", peer => {
            console.log("Getting Producers ", ++i, peer)
            const flatProducerIds = peer.flat()
            signalNewRecvTransport(flatProducerIds)
        })
    }

    const handleProducerClose = ({ remoteProducerId }) => {
        const consumerToClose = consumerTransportRef.current.find(transportData => transportData.remoteProducerId === remoteProducerId)
        consumerTransportRef.current = consumerTransportRef.current.filter(transportData => transportData.remoteProducerId !== remoteProducerId)

        consumerToClose.transport.close()
        consumerToClose.consumer.close()

        setRemoveStream(true)
        setShowUserLeftPopup(true)
        setTimeout(() => {
            setShowUserLeftPopup(false)
        }, 2500);
    }

    const handleNewProducer = ({ newProducers, i }) => {
        console.log("New Producer", i, newProducers)
        signalNewRecvTransport(newProducers)
    }

    const handleCallEnd = () => {
        producerTransportRef.current.forEach(producerData => {
            producerData.transport.close()
            producerData.producer.close()
        })
        consumerTransportRef.current.forEach(consumerData => {
            consumerData.transport.close()
            consumerData.consumer.close()
        })
        
        myStream.getTracks().forEach(track => {
            track.stop();
        });
        setMyStream(null)
        navigate("/live");
        setTimeout(() => window.location.reload(), 200);
    }

    // Step-1: Get RTP Capabilities from the router created in the server 
    const joinRoom = () => {
        socket.emit("joinRoom", { roomId }, (data) => {
            setRtpCapabilities(data.rtpCapabilities)
        })
    }

    // Step-2: Create a Device using the RTP Capabilities
    const createDevice = useCallback(async () => {
        try {
            const newDevice = new mediasoupClient.Device()
            await newDevice.load({ routerRtpCapabilities: rtpCapabilities })
            deviceRef.current = newDevice
            setDevice(newDevice)
            return newDevice
        }
        catch (error) {
            console.log(error)
            if (error.name === 'UnsupportedError') console.warn('browser not supported');
        }
    }, [rtpCapabilities])

    // Step-3: Create a Producer/Send Transport
    const createSendTransport = useCallback(() => {
        console.log("Called createSendTransport")

        socket.emit("createWebRTCTransport", { consumer: false }, ({ params }) => {
            // params also contains iceServers (Twilio TURN) for cross-network NAT traversal
            console.log("[ICE] Send transport params — iceServers:", params.iceServers, "iceCandidates:", params.iceCandidates)
            const producerTransport = deviceRef.current.createSendTransport(params)

            // ICE/DTLS diagnostics — tells us exactly where the connection fails
            producerTransport.on("connectionstatechange", (state) => {
                console.log("[ICE] SendTransport connectionstatechange →", state)
            })
            producerTransport.on("icegatheringstatechange", (state) => {
                console.log("[ICE] SendTransport icegatheringstatechange →", state)
            })

            producerTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
                console.log("DTLS Params on Producer Connect --> ", dtlsParameters)
                socket.emit("producerTransport-connect", { dtlsParameters }, (res) => {
                    if (res?.error) {
                        console.error("producerTransport-connect error on server:", res.error)
                        errback(new Error(res.error))
                    } else {
                        callback()
                    }
                })
            })

            producerTransport.on("produce", (parameters, callback, errback) => {
                console.log("Parameters on Producer Produce --> ", parameters)
                try {
                    socket.emit("producerTransport-produce", {
                        kind: parameters.kind,
                        rtpParameters: parameters.rtpParameters,
                        appData: parameters.appData,
                    }, ({ id, producerExists }) => {
                        callback({ id })
                        if (producerExists) {
                            console.log("Producer Exists --> ", producerExists)
                            if(!producersGot.current){
                                getProducers()
                                producersGot.current = true
                            }
                        };
                    })
                }
                catch (error) {
                    errback(error)
                }
            })
            setProducerTransport(producerTransport)
        })
    }, [device, producerTransport])

    // Step-4: Create Producer and start sending your video track by connecting to the Producer Transport
    const connectSendTransport = useCallback(async () => {
        let videoTrack = myStream.getVideoTracks()[0]
        let audioTrack = myStream.getAudioTracks()[0]
        
        let newVideoProducer = await producerTransport.produce({ track: videoTrack });
        let newAudioProducer = await producerTransport.produce({ track: audioTrack });
        
        producerTransportRef.current = [
            {
                transport: producerTransport,
                producer: newVideoProducer,
            },
            {
                transport: producerTransport,
                producer: newAudioProducer,
            }
        ]

        newVideoProducer.on("trackend", () => {
            console.log("Video Track ended")
        })
        newVideoProducer.on("transportclose", () => {
            console.log("Video Producer Transport closed")
        })
        newAudioProducer.on("trackend", () => {
            console.log("Audio Track ended")
        })
        newAudioProducer.on("transportclose", () => {
            console.log("Audio Producer Transport closed")
        })

        setVideoTransporter(newVideoProducer)
        setAudioTransporter(newAudioProducer)
    }, [producerTransport, myStream])

    // Step-3or: Create a Consumer/Receive Transport and immediately consume each producer
    const signalNewRecvTransport = useCallback((remoteProducerIds) => {
        console.log("Called signalNewRecvTransport", remoteProducerIds)

        socket.emit("createWebRTCTransport", { consumer: true }, ({ params }) => {
            if (params.error) {
                console.error(params.error)
                return
            }
            // params.iceServers contains Twilio TURN credentials for cross-network NAT traversal
            console.log("[ICE] Recv transport params — iceServers:", params.iceServers, "iceCandidates:", params.iceCandidates)
            let consumerTransport = deviceRef.current.createRecvTransport(params)

            // ICE/DTLS diagnostics
            consumerTransport.on("connectionstatechange", (state) => {
                console.log("[ICE] RecvTransport connectionstatechange →", state)
            })
            consumerTransport.on("icegatheringstatechange", (state) => {
                console.log("[ICE] RecvTransport icegatheringstatechange →", state)
            })

            consumerTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
                console.log("DTLS Params on Consumer Connect --> ", dtlsParameters)
                socket.emit("consumerTransport-connect", {
                    dtlsParameters,
                    serverConsumerTransportId: params.id
                }, (res) => {
                    if (res?.error) {
                        console.error("consumerTransport-connect error on server:", res.error)
                        errback(new Error(res.error))
                    } else {
                        callback()
                    }
                })
            })

            // Immediately consume each producer — no deferred state needed
            remoteProducerIds.forEach(remoteProducerId => {
                connectRecvTransport(consumerTransport, remoteProducerId, params.id)
            })
        })
    }, [device])

    // Step-4or: Create a Consumer and start receiving the producer's video/audio feed
    const connectRecvTransport = useCallback((consumerTransport, remoteProducerId, serverConsumerTransportId) => {
        // Guard against duplicate consumption (e.g. if new-producer fires twice)
        if (consumedProducerIdsRef.current.has(remoteProducerId)) {
            console.log("Already consuming producer", remoteProducerId, "— skipping")
            return
        }
        consumedProducerIdsRef.current.add(remoteProducerId)
        console.log("Called connectRecvTransport for", remoteProducerId)

        socket.emit("consumerTransport-consume", {
            rtpCapabilities: deviceRef.current.rtpCapabilities,
            serverConsumerTransportId,
            remoteProducerId
        },
            async ({ params }) => {
                if (params.error) {
                    console.error(params.error)
                    consumedProducerIdsRef.current.delete(remoteProducerId)
                    return
                }
                let consumer = await consumerTransport.consume(params)

                consumerTransportRef.current = [
                    ...consumerTransportRef.current,
                    {
                        transport: consumerTransport,
                        remoteProducerId,
                        consumer,
                        serverConsumerTransportId
                    }
                ]

                const { track } = consumer;
                console.log("Track", track)
                // If track stays muted after a few seconds, ICE failed (firewall / NAT issue)
                track.onunmute = () => console.log(`[ICE] ✅ ${track.kind} track UNMUTED — media is flowing!`)
                track.onmute   = () => console.log(`[ICE] ⚠️  ${track.kind} track re-MUTED — media interrupted`)

                socket.emit("consumer-resume", { consumerId: consumer.id })

                // Accumulate tracks in refs and build MediaStream when both video+audio arrive
                if (track.kind === "video") {
                    pendingVideoTracksRef.current[remoteProducerId] = track
                } else {
                    pendingAudioTracksRef.current[remoteProducerId] = track
                }

                const videoKeys = Object.keys(pendingVideoTracksRef.current)
                const audioKeys = Object.keys(pendingAudioTracksRef.current)
                const minPaired = Math.min(videoKeys.length, audioKeys.length)
                if (minPaired > 0) {
                    const newStreams = []
                    for (let idx = 0; idx < minPaired; idx++) {
                        const vTrack = pendingVideoTracksRef.current[videoKeys[idx]]
                        const aTrack = pendingAudioTracksRef.current[audioKeys[idx]]
                        newStreams.push(new MediaStream([vTrack, aTrack]))
                        delete pendingVideoTracksRef.current[videoKeys[idx]]
                        delete pendingAudioTracksRef.current[audioKeys[idx]]
                    }
                    setRemoteStream(prev => [...prev, ...newStreams])
                }
            })
    }, [device])

    // Track pairing is now handled inline in connectRecvTransport via refs (see above)
    // This effect is intentionally removed to avoid the race condition where
    // videoTracks and audioTracks state updates weren't synchronised

    useEffect(() => {
        if (rtpCapabilities) {
            createDevice()
        }
    }, [rtpCapabilities])

    useEffect(() => {
        if (device) {
            if (!producerTransRef.current) {
                createSendTransport();
                producerTransRef.current = true
            }
        }
    }, [device])

    useEffect(() => {
        if (producerTransport && myStream && producerTransRef.current && !isSendTransportConnectedRef.current) {
            connectSendTransport()
            isSendTransportConnectedRef.current = true
        }
    }, [producerTransport, myStream])

    // Consumer transport creation + consumption is now handled directly in signalNewRecvTransport.
    // The old canConnectToRecvTransport + connectingConsumerTransportData effect has been removed
    // because it re-ran on every state change, creating duplicate consumers.

    useEffect(() => {
        if (!myStream && !roomJoinedRef.current) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then((stream) => {
                    setMyStream(stream)
                })
        }
        if (myStream && !roomJoinedRef.current) {
            joinRoom()
            roomJoinedRef.current = true
        }
    }, [myStream])

    useEffect(() => {
        if(removeStream && remoteStream) {
            let filteredStream = remoteStream.filter(stream => stream.active)
            setRemoteStream(filteredStream)
            setRemoveStream(false)
        }
    }, [remoteStream, removeStream])

    useEffect(() => {
        socket.on("user-joined", handleUserJoined)
        socket.on("user-joined-confirm:client", handleUserJoinedConfirm)
        socket.on("new-producer", handleNewProducer)
        socket.on('producer-closed', handleProducerClose)

        return () => {
            socket.off("user-joined", handleUserJoined)
            socket.off("user-joined-confirm:client", handleUserJoinedConfirm)
            socket.off("new-producer", handleNewProducer)
            socket.off('producer-closed', handleProducerClose)
        }
    }, [socket, handleUserJoined, handleUserJoinedConfirm])

    // Helper function to determine grid layout based on participant count
    const getGridLayout = (participantCount) => {
        if (participantCount <= 1) return "grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1"
        if (participantCount === 2) return "grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1"
        if (participantCount <= 4) return "grid-cols-2 grid-rows-2"
        return "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
    }

    // Calculate total participants (my stream + remote streams)
    const totalParticipants = 1 + (remoteStream?.length || 0)

    return (
        <div className="h-[100dvh] max-h-[100dvh] bg-zinc-950 text-zinc-100 font-sans flex flex-col justify-between overflow-hidden selection:bg-zinc-800 selection:text-zinc-100">
            {/* User Left Popup Notification */}
            {showUserLeftPopup && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] animate-bounce px-3 w-full max-w-sm">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 shadow-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300">
                                <UserIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-xs sm:text-sm font-semibold text-white">Participant Left</h3>
                                <p className="text-zinc-400 text-[11px] sm:text-xs">The remote participant disconnected.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowUserLeftPopup(false)}
                            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        >
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Top Bar */}
            <header className="px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-zinc-800 bg-zinc-950 flex-shrink-0 z-40">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Brand & Room Info */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200">
                            <VideoIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <h1 className="text-xs sm:text-sm font-semibold text-white tracking-tight">Videocall</h1>
                            <span className="text-zinc-600">/</span>
                            <span className="font-mono text-[11px] sm:text-xs text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded-md border border-zinc-800 max-w-[120px] sm:max-w-none truncate">
                                {roomId}
                            </span>
                        </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center gap-1.5 sm:gap-3">
                        {/* Participants Pill */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] sm:text-xs font-medium text-zinc-300">
                            <UsersIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-400" />
                            <span>{totalParticipants}</span>
                        </div>

                        {/* Connection Pill */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] sm:text-xs font-medium">
                            {isConnected === true ? (
                                <>
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500"></span>
                                    <span className="text-emerald-400 hidden xs:inline sm:inline">Connected</span>
                                </>
                            ) : isConnected === false ? (
                                <>
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500"></span>
                                    <span className="text-amber-400 hidden xs:inline sm:inline">Connecting</span>
                                </>
                            ) : isConnected === undefined ? (
                                <>
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500"></span>
                                    <span className="text-red-400 hidden xs:inline sm:inline">Failed</span>
                                </>
                            ) : (
                                <>
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-zinc-500"></span>
                                    <span className="text-zinc-400 hidden xs:inline sm:inline">Standby</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Video Streams Canvas */}
            <main className="flex-1 min-h-0 p-2 sm:p-4 pb-20 sm:pb-24 max-w-7xl mx-auto w-full flex items-center justify-center">
                <div className={`w-full h-full grid gap-2 sm:gap-4 min-h-0 ${getGridLayout(totalParticipants)}`}>
                    
                    {/* My Video Stream */}
                    <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center h-full min-h-0 w-full">
                        {myStream ? (
                            <div className="w-full h-full relative [&_video]:!object-cover [&_video]:!w-full [&_video]:!h-full [&_video]:!-scale-x-100 flex items-center justify-center">
                                <ReactPlayer
                                    url={myStream}
                                    muted
                                    playing
                                    playsinline
                                    config={{ file: { attributes: { playsInline: true } } }}
                                    width="100%"
                                    height="100%"
                                    style={{ objectFit: 'cover' }}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-zinc-500 p-4 text-center">
                                <VideoIcon className="w-8 h-8 sm:w-10 sm:h-10 mb-2 sm:mb-3 text-zinc-600" />
                                <p className="text-xs sm:text-sm font-medium text-zinc-400">Connecting camera & mic...</p>
                            </div>
                        )}

                        {/* Stream Badge */}
                        <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-black/60 border border-zinc-800">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[11px] sm:text-xs font-medium text-zinc-200">You</span>
                        </div>
                    </div>

                    {/* Remote Streams */}
                    {remoteStream && remoteStream.length > 0 ? (
                        remoteStream.map((stream, index) => (
                            <div key={index} className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center h-full min-h-0 w-full">
                                <div className="w-full h-full relative [&_video]:!object-cover [&_video]:!w-full [&_video]:!h-full flex items-center justify-center">
                                    <ReactPlayer
                                        url={stream}
                                        playing
                                        muted={!remoteAudioEnabled}
                                        playsinline
                                        config={{ file: { attributes: { playsInline: true } } }}
                                        onError={(e) => console.error("Remote player error", e)}
                                        width="100%"
                                        height="100%"
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>

                                {/* Stream Badge */}
                                <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-black/60 border border-zinc-800">
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500"></div>
                                    <span className="text-[11px] sm:text-xs font-medium text-zinc-200">
                                        Participant {index + 1}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        /* Empty Remote Placeholder */
                        <div className="relative rounded-2xl overflow-hidden bg-zinc-900/40 border border-dashed border-zinc-800 flex items-center justify-center h-full min-h-0 p-4 sm:p-6 text-center">
                            <div className="max-w-xs space-y-2 sm:space-y-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto text-zinc-400">
                                    <UserIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <h4 className="text-xs sm:text-sm font-semibold text-zinc-300">
                                    {remoteSocketId ? "Participant joined, preparing feed..." : "Waiting for another participant..."}
                                </h4>
                                <p className="text-[11px] sm:text-xs text-zinc-500">
                                    Share room ID <span className="font-mono text-zinc-300 font-semibold">{roomId}</span> with anyone to start video chatting.
                                </p>
                            </div>
                        </div>
                    )}

                </div>
            </main>

            {/* Floating Bottom Control Dock */}
            <div className="fixed bottom-3 sm:bottom-6 left-0 right-0 z-50 flex flex-col items-center pointer-events-none px-3 sm:px-4">
                
                {/* Floating Status Notification */}
                {isConnected === null && remoteSocketId && (
                    <div className="mb-2 sm:mb-3 pointer-events-auto px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] sm:text-xs font-medium text-zinc-300 shadow-md text-center max-w-[90vw] truncate">
                        Participant detected. Establishing stream channels...
                    </div>
                )}

                {/* Main Action Dock */}
                <div className="pointer-events-auto bg-zinc-900 border border-zinc-800 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full shadow-xl flex items-center gap-2 sm:gap-3">
                    
                    {/* Audio Toggle Button */}
                    {remoteStream && remoteStream.length > 0 && (
                        <button
                            onClick={() => setRemoteAudioEnabled(prev => !prev)}
                            className={`p-2.5 sm:p-3 rounded-full transition-colors cursor-pointer ${
                                remoteAudioEnabled 
                                    ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white" 
                                    : "bg-red-950 border border-red-800 text-red-400 hover:bg-red-900"
                            }`}
                            title={remoteAudioEnabled ? "Mute Remote Audio" : "Unmute Remote Audio"}
                        >
                            {remoteAudioEnabled ? <VolumeIcon className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeXIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </button>
                    )}

                    {/* End Call Button */}
                    {remoteSocketId ? (
                        <button
                            onClick={handleCallEnd}
                            className="flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-semibold rounded-full transition-colors cursor-pointer"
                        >
                            <PhoneOffIcon className="w-4 h-4" />
                            <span>Leave Call</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleCallEnd}
                            className="flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:px-4 sm:py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs sm:text-sm font-medium rounded-full transition-colors cursor-pointer"
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

export default LiveRoom