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
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 selection:text-zinc-100">
            {hide ? (
                <>
                    {/* Header */}
                    <header className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-50">
                        <div className="max-w-7xl mx-auto flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200">
                                    <VideoIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <h1 className="text-base font-semibold text-white tracking-tight">
                                        Videocall
                                    </h1>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span>SFU Active</span>
                            </div>
                        </div>
                    </header>

                    {/* Hero & Lobby Area */}
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-14">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* Left Column: Mode Selector & Description */}
                            <div className="lg:col-span-5 flex flex-col justify-center pt-2 md:pt-4">
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-medium mb-4 w-fit">
                                    <SparklesIcon className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>Mediasoup SFU</span>
                                </div>

                                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4 leading-tight">
                                    Video calling app, built with Mediasoup.
                                </h2>

                                <p className="text-zinc-400 text-sm sm:text-base mb-8 leading-relaxed">
                                    {currentCategory === "record"
                                        ? "Asynchronous video messaging. Record short high-quality clips and stream them instantly to peer."
                                        : "Direct real-time two-way video calls powered by Mediasoup SFU routing."}
                                </p>

                                {/* Mode Tabs */}
                                <div className="p-1 bg-zinc-900 border border-zinc-800 rounded-xl flex gap-1.5 w-full max-w-md">
                                    <button
                                        onClick={() => setcurrentCategory("live")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                                            currentCategory === "live"
                                                ? "bg-white text-zinc-950 font-semibold"
                                                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                                        }`}
                                    >
                                        <RadioIcon
                                            className={`w-4 h-4 ${currentCategory === "live" ? "text-zinc-950" : "text-zinc-400"}`}
                                        />
                                        <span>Live Call</span>
                                    </button>

                                    <button
                                        onClick={() => setcurrentCategory("record")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                                            currentCategory === "record"
                                                ? "bg-white text-zinc-950 font-semibold"
                                                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                                        }`}
                                    >
                                        <FilmIcon
                                            className={`w-4 h-4 ${currentCategory === "record" ? "text-zinc-950" : "text-zinc-400"}`}
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
                    <div className="border-t border-zinc-800/80 bg-zinc-950 py-16 px-4 sm:px-6 mt-8">
                        <div className="max-w-7xl mx-auto">
                            <div className="text-center max-w-2xl mx-auto mb-12">
                                <h3 className="text-2xl font-bold tracking-tight text-white mb-2">
                                    Built for reliable communication
                                </h3>
                                <p className="text-zinc-400 text-sm">
                                    Choose between instant bidirectional streaming or walkie-talkie style recording.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {/* Live Mode Card */}
                                <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-4">
                                        <RadioIcon className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-base font-semibold text-white mb-2">Live Mode</h4>
                                    <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                                        Instant multi-stream audio and video with sub-second latency.
                                    </p>
                                    <ul className="text-xs text-zinc-300 space-y-2">
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                            <span>Real-time VP8 & Opus encoding</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                            <span>Selective Forwarding Unit (SFU) architecture</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                            <span>Bandwidth-adaptive routing</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Recording Mode Card */}
                                <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-4">
                                        <FilmIcon className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-base font-semibold text-white mb-2">Walkie Mode</h4>
                                    <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                                        Record quick video dispatches and pipe them to your partner.
                                    </p>
                                    <ul className="text-xs text-zinc-300 space-y-2">
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                            <span>Chunk-streamed WebM data transmission</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                            <span>No server-side file persistence required</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                            <span>Auto-playback on receipt</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Room System Card */}
                                <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-4">
                                        <DoorIcon className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-base font-semibold text-white mb-2">Instant Rooms</h4>
                                    <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                                        Zero friction rooms — enter a shared ID and connect instantly.
                                    </p>
                                    <ul className="text-xs text-zinc-300 space-y-2">
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                            <span>Dynamic router allocation per room</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                            <span>Shareable link join workflow</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                            <span>Automatic teardown when empty</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Step Flow */}
                            <div className="mt-12 p-6 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-semibold text-xs flex items-center justify-center">
                                        1
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Pick Mode</p>
                                        <p className="text-xs text-zinc-400">Live or Walkie</p>
                                    </div>
                                </div>
                                <div className="hidden md:block w-8 h-px bg-zinc-800"></div>
                                <div className="flex items-center gap-4">
                                    <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-semibold text-xs flex items-center justify-center">
                                        2
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Enter Room ID</p>
                                        <p className="text-xs text-zinc-400">Share with partner</p>
                                    </div>
                                </div>
                                <div className="hidden md:block w-8 h-px bg-zinc-800"></div>
                                <div className="flex items-center gap-4">
                                    <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-semibold text-xs flex items-center justify-center">
                                        3
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Connected</p>
                                        <p className="text-xs text-zinc-400">Start communicating</p>
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
