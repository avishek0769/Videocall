import React, { useContext, useEffect, useRef, useState, useCallback } from 'react'
import ReactPlayer from "react-player"
import { useNavigate, useParams } from 'react-router-dom'
import { SocketContext } from '../../context/SocketProvider'
import * as mediasoupClient from "mediasoup-client"

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
    const [connectingConsumerTransportData, setConnectingConsumerTransportData] = useState([])
    const [canConnectToRecvTransport, setCanConnectToRecvTransport] = useState(false)
    const [removeStream, setRemoveStream] = useState(false)
    const [videoTracks, setVideoTracks] = useState([])
    const [audioTracks, setAudioTracks] = useState([])
    const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(false)
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

            peer.forEach(signalNewRecvTransport)
            setTimeout(() => {
                setCanConnectToRecvTransport(true)
            }, 1000);
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
        isSendTransportConnectedRef.current = false
        signalNewRecvTransport(newProducers)
        setCanConnectToRecvTransport(true)
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
            // console.log(params)
            const producerTransport = deviceRef.current.createSendTransport(params)

            producerTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
                console.log("DTLS Params on Producer Connect --> ", dtlsParameters)
                try {
                    await socket.emit("producerTransport-connect", { dtlsParameters })
                    callback()
                }
                catch (error) {
                    errback(error)
                }
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

    // Step-3or: Create a Consumer/Receive Transport
    const signalNewRecvTransport = useCallback((remoteProducerIds) => {
        console.log("Called signalNewRecvTransport")

        socket.emit("createWebRTCTransport", { consumer: true }, ({ params }) => {
            if (params.error) {
                console.error(params.error)
                return
            }
            let consumerTransport = deviceRef.current.createRecvTransport(params)

            consumerTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
                // console.log("DTLS Params --> ", dtlsParameters)
                try {
                    socket.emit("consumerTransport-connect", {
                        dtlsParameters,
                        serverConsumerTransportId: params.id
                    })
                    callback()
                }
                catch (error) {
                    console.log(errback)
                    errback(errback)
                }
            })

            remoteProducerIds.forEach(remoteProducerId => {
                setConnectingConsumerTransportData(prev => [
                    ...prev,
                    {
                        serverConsumerTransportId: params.id,
                        remoteProducerId,
                        consumerTransport
                    }
                ])
            })
        })
    }, [device])

    // Step-4or: Create a Consumer and start receiving the prducers video feed
    const connectRecvTransport = useCallback((consumerTransport, remoteProducerId, serverConsumerTransportId) => {
        console.log("Called connectRecvTransport")

        socket.emit("consumerTransport-consume", {
            rtpCapabilities: deviceRef.current.rtpCapabilities,
            serverConsumerTransportId,
            remoteProducerId
        },
            async ({ params }) => {
                if (params.error) {
                    console.error(params.error)
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

                if(track.kind == "video") setVideoTracks(prev => [...prev, track]);
                else setAudioTracks(prev => [...prev, track]);

                socket.emit("consumer-resume", { consumerId: consumer.id })
            })
    }, [device])

    useEffect(() => {
        if((videoTracks.length && audioTracks.length) && (videoTracks.length == audioTracks.length)) {
            videoTracks.forEach((videoTrack, index) => {
                const stream = new MediaStream([videoTrack, audioTracks[index]])
                setRemoteStream(prev => [...prev, stream])
            })
            setVideoTracks([])
            setAudioTracks([])
        }
    }, [videoTracks, audioTracks])

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

    useEffect(() => {
        if (Object.keys(connectingConsumerTransportData).length && canConnectToRecvTransport) {
            connectingConsumerTransportData.forEach(elem => {
                let { consumerTransport, remoteProducerId, serverConsumerTransportId } = elem;
                connectRecvTransport(consumerTransport, remoteProducerId, serverConsumerTransportId)
            })
            setTimeout(() => {
                setConnectingConsumerTransportData([])
            }, 1500);
        }
    }, [canConnectToRecvTransport, connectingConsumerTransportData])

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
        if (participantCount <= 1) return "grid-cols-1"
        if (participantCount === 2) return "grid-cols-2 md:grid-cols-2"
        if (participantCount <= 4) return "grid-cols-2 md:grid-cols-2"
        if (participantCount <= 6) return "grid-cols-2 md:grid-cols-2 lg:grid-cols-3"
        return "grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    }

    // Calculate total participants (my stream + remote streams)
    const totalParticipants = 1 + (remoteStream?.length || 0)

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans">
            {/* User Left Popup */}
            {showUserLeftPopup && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] animate-slide-down">
                    <div className="bg-gradient-to-r from-gray-900/95 to-gray-800/95 border border-red-500/40 rounded-xl px-4 py-3 mx-4 backdrop-blur-lg shadow-2xl shadow-red-500/20 w-[280px] md:w-auto">
                        <div className="flex items-center gap-3">
                            <div className="text-2xl">👋</div>
                            <div>
                                <h3 className="text-sm font-semibold text-red-400">
                                    User Left
                                </h3>
                                <p className="text-gray-300 text-xs">
                                    Participant has left the call
                                </p>
                            </div>
                            <button
                                onClick={() => setShowUserLeftPopup(false)}
                                className="ml-2 text-gray-400 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="px-6 py-4 border-b border-gray-700 bg-black/30 backdrop-blur-lg sticky top-0 z-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-2xl drop-shadow-lg">🔴</div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-red-400 to-teal-400 bg-clip-text text-transparent">
                            Live Video Call
                        </h1>
                    </div>

                    {/* Connection Status */}
                    <div className="flex items-center gap-2">
                        {isConnected === true ? (
                            <>
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-green-400 text-sm font-medium">Connected</span>
                            </>
                        ) : isConnected === false ? (
                            <>
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                <span className="text-yellow-400 text-sm font-medium">Connecting...</span>
                            </>
                        ) : isConnected === undefined ? (
                            <>
                                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                                <span className="text-red-400 text-sm font-medium">Failed</span>
                            </>
                        ) : (
                            <>
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <span className="text-gray-400 text-sm font-medium">Waiting</span>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Video Container */}
            <div className="flex-1 p-4 md:p-6 overflow-hidden">
                <div className={`h-[calc(100vh-140px)] overflow-y-auto overflow-x-hidden grid gap-4 md:gap-6 auto-rows-min ${getGridLayout(totalParticipants)}`}>
                    {/* My Video */}
                    <div className="bg-gray-900/50 border border-gray-700 rounded-2xl overflow-hidden backdrop-blur-lg min-h-[200px] h-[250px] md:h-[300px]">
                        <div className="h-full relative">
                            {myStream ? (
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
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-4xl md:text-6xl mb-4 opacity-30">📹</div>
                                        <p className="text-gray-400 text-sm">Loading camera...</p>
                                    </div>
                                </div>
                            )}

                            {/* Video Label */}
                            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg">
                                <span className="text-white text-sm font-medium">You</span>
                            </div>
                        </div>
                    </div>

                    {/* Remote Video Streams */}
                    {remoteStream && remoteStream.length > 0 ? (
                        remoteStream.map((stream, index) => (
                            <div key={index} className="bg-gray-900/50 border border-gray-700 rounded-2xl overflow-hidden backdrop-blur-lg min-h-[200px] h-[250px] md:h-[300px]">
                                <div className="h-full relative">
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

                                    {/* Video Label */}
                                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg">
                                        <span className="text-white text-sm font-medium">
                                            Participant {index + 1}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        // Placeholder when no remote streams
                        remoteSocketId && (
                            <div className="bg-gray-900/50 border border-gray-700 rounded-2xl overflow-hidden backdrop-blur-lg min-h-[200px] h-[250px] md:h-[300px]">
                                <div className="h-full flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-4xl md:text-6xl mb-4 opacity-30">👤</div>
                                        <p className="text-gray-400 text-sm">Waiting for video...</p>
                                    </div>
                                </div>
                            </div>
                        )
                    )}

                    {/* Waiting for participants placeholder */}
                    {!remoteSocketId && (
                        <div className="bg-gray-900/50 border border-gray-700 rounded-2xl overflow-hidden backdrop-blur-lg min-h-[200px] h-[250px] md:h-[300px]">
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-4xl md:text-6xl mb-4 opacity-30">👤</div>
                                    <p className="text-gray-400 text-sm">Waiting for participant...</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Control Panel */}
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent backdrop-blur-lg border-t border-gray-700">
                <div className="px-4 py-2 md:px-6 md:py-3 flex justify-center items-center gap-4">
                    {/* Status Message */}
                    {isConnected === null && (
                        <div className="text-center mb-2">
                            <p className="text-gray-300 text-sm md:text-sm">
                                {remoteSocketId
                                    ? "✅ Participant joined! Ready to start call..."
                                    : "⏳ Waiting for participant to join..."
                                }
                            </p>
                        </div>
                    )}

                    {/* Control Buttons */}
                    <div className="flex items-center justify-center gap-2 md:gap-3">
                        {remoteStream && remoteStream.length > 0 && (
                            <button
                                onClick={() => setRemoteAudioEnabled(prev => !prev)}
                                className="flex items-center gap-1 px-4 py-2 md:px-6 bg-white/10 border border-white/20 text-gray-200 font-semibold rounded-lg md:rounded-xl transition-all duration-300 hover:bg-white/20 text-sm md:text-base"
                            >
                                <span className="text-sm md:text-lg">🔊</span>
                                <span className="hidden md:inline">{remoteAudioEnabled ? "Mute Remote" : "Enable Audio"}</span>
                            </button>
                        )}

                        {/* End Call Button */}
                        {remoteSocketId && (
                            <button
                                onClick={handleCallEnd}
                                className="flex items-center gap-1 px-4 py-2 md:px-6 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg md:rounded-xl shadow-lg shadow-red-500/30 hover:shadow-red-500/40 transition-all duration-300 hover:scale-105 text-sm md:text-base"
                            >
                                <span className="text-sm md:text-lg">📞</span>
                                <span className="hidden md:inline">End Call</span>
                            </button>
                        )}

                        {/* Back Button */}
                        {!remoteSocketId && (
                            <button
                                onClick={handleCallEnd}
                                className="flex items-center gap-1 px-4 py-2 md:px-6 bg-white/10 border border-white/20 text-gray-300 font-semibold rounded-lg md:rounded-xl transition-all duration-300 hover:bg-white/20 text-sm md:text-base"
                            >
                                <span className="text-sm md:text-lg">←</span>
                                <span className="hidden md:inline">Back to Home</span>
                            </button>
                        )}
                    </div>

                    {/* Connection Status Text */}
                    {isConnected === true && (
                        <div className="text-center mt-1">
                            <p className="text-green-400 text-sm font-medium">
                                🎉 Call connected successfully!
                            </p>
                        </div>
                    )}

                    {isConnected === false && (
                        <div className="text-center mt-1">
                            <p className="text-yellow-400 text-sm font-medium">
                                🔄 Establishing connection... this may take a minute.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default LiveRoom