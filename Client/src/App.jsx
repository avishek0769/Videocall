import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { VideoIcon, RadioIcon, FilmIcon, CheckIcon, DoorIcon, SparklesIcon, ShieldCheckIcon } from "./components/Icons";

function App() {
    const [currentCategory, setcurrentCategory] = useState("");
    const [hide, setHide] = useState(false);
    const navigate = useNavigate();
    const route = useLocation();

    useEffect(() => {
        setcurrentCategory("live");
    }, []);

    useEffect(() => {
        setHide(!route.pathname.includes("room"));
    }, [route]);

    useEffect(() => {
        if (currentCategory == "record") {
            navigate("/record");
        } else {
            navigate("/live");
        }
    }, [currentCategory]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            {hide ? (
                <>
                    {/* Header */}
                    <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50">
                        <div className="max-w-7xl mx-auto flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                                    <VideoIcon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight">
                                        PulseCall
                                    </h1>
                                    <span className="text-[10px] uppercase tracking-widest font-semibold text-cyan-400 block -mt-1">
                                        WebRTC Studio
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>SFU Ready</span>
                            </div>
                        </div>
                    </header>

                    {/* Hero & Lobby Area */}
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* Left Column: Mode Selector & Description */}
                            <div className="lg:col-span-5 flex flex-col justify-center pt-2 md:pt-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 text-xs font-medium mb-4 w-fit">
                                    <SparklesIcon className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>Real-Time Media Engine</span>
                                </div>

                                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
                                    Video calling app,{" "}
                                    <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
                                        built with MediaSoup.
                                    </span>
                                </h2>

                                <p className="text-slate-400 text-sm sm:text-base mb-8 leading-relaxed">
                                    {currentCategory === "record"
                                        ? "Asynchronous video messaging. Record short high-quality clips and stream them instantly to peer."
                                        : "Direct real-time two-way video calls powered by Mediasoup SFU routing."}
                                </p>

                                {/* Mode Tabs */}
                                <div className="p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex gap-2 w-full max-w-md shadow-inner">
                                    <button
                                        onClick={() => setcurrentCategory("live")}
                                        className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                            currentCategory === "live"
                                                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
                                                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                        }`}
                                    >
                                        <RadioIcon
                                            className={`w-4 h-4 ${currentCategory === "live" ? "text-white" : "text-slate-400"}`}
                                        />
                                        <span>Live Call</span>
                                    </button>

                                    <button
                                        onClick={() => setcurrentCategory("record")}
                                        className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                            currentCategory === "record"
                                                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
                                                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                        }`}
                                    >
                                        <FilmIcon
                                            className={`w-4 h-4 ${currentCategory === "record" ? "text-white" : "text-slate-400"}`}
                                        />
                                        <span>Walkie Mode</span>
                                    </button>
                                </div>
                            </div>

                            {/* Right Column: Active Lobby View (Join Room Card) */}
                            <div className="lg:col-span-7 flex justify-center">
                                <div className="w-full max-w-lg">
                                    <Outlet />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Feature Cards Section */}
                    <div className="border-t border-slate-800/80 bg-slate-950/60 py-16 px-4 sm:px-6 mt-8">
                        <div className="max-w-7xl mx-auto">
                            <div className="text-center max-w-2xl mx-auto mb-12">
                                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
                                    Built for crisp communication
                                </h3>
                                <p className="text-slate-400 text-sm sm:text-base">
                                    Choose between instant bidirectional streaming or walkie-talkie style recording.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Live Mode Card */}
                                <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-300 group">
                                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-105 transition-transform">
                                        <RadioIcon className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-2">Live Mode</h4>
                                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                                        Instant multi-stream audio and video with sub-second latency.
                                    </p>
                                    <ul className="text-xs text-slate-300 space-y-2.5">
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                                            <span>Real-time VP8 & Opus encoding</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                                            <span>Selective Forwarding Unit (SFU) architecture</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                                            <span>Bandwidth-adaptive routing</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Recording Mode Card */}
                                <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800/80 hover:border-blue-500/40 transition-all duration-300 group">
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5 group-hover:scale-105 transition-transform">
                                        <FilmIcon className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-2">Walkie Mode</h4>
                                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                                        Record quick video dispatches and pipe them to your partner.
                                    </p>
                                    <ul className="text-xs text-slate-300 space-y-2.5">
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                            <span>Chunk-streamed WebM data transmission</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                            <span>No server-side file persistence required</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                            <span>Auto-playback on receipt</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Room System Card */}
                                <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-300 group">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-105 transition-transform">
                                        <DoorIcon className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-2">Instant Rooms</h4>
                                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                                        Zero friction rooms — enter a shared ID and connect instantly.
                                    </p>
                                    <ul className="text-xs text-slate-300 space-y-2.5">
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                                            <span>Dynamic router allocation per room</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                                            <span>Shareable link join workflow</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                                            <span>Automatic teardown when empty</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Step Flow */}
                            <div className="mt-12 p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-sm flex items-center justify-center">
                                        1
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">Pick Mode</p>
                                        <p className="text-xs text-slate-400">Live or Walkie</p>
                                    </div>
                                </div>
                                <div className="hidden md:block w-8 h-px bg-slate-800"></div>
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-bold text-sm flex items-center justify-center">
                                        2
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">Enter Room ID</p>
                                        <p className="text-xs text-slate-400">Share with partner</p>
                                    </div>
                                </div>
                                <div className="hidden md:block w-8 h-px bg-slate-800"></div>
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center">
                                        3
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">Connected</p>
                                        <p className="text-xs text-slate-400">Start communicating</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <Outlet />
            )}
        </div>
    );
}

export default App;
