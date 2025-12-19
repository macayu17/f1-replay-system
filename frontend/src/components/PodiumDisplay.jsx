import React from 'react';

const getDriverCode = (info, fallback) => {
    const rawAbbr = String(info?.Abbreviation ?? '').trim().toUpperCase();
    if (rawAbbr.length === 3) return rawAbbr;
    if (rawAbbr.length > 3) return rawAbbr.slice(0, 3);

    const last = String(info?.LastName ?? '').trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (last.length >= 3) return last.slice(0, 3);

    const first = String(info?.FirstName ?? '').trim().toUpperCase().replace(/[^A-Z]/g, '');
    const combined = (first.slice(0, 1) + last.slice(0, 2)).replace(/[^A-Z]/g, '');
    if (combined.length === 3) return combined;

    const fb = String(fallback ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return fb ? fb.slice(0, 3) : '---';
};

const PodiumDisplay = ({ standings, driversInfo, isRaceFinished, onClose }) => {
    if (!isRaceFinished || standings.length < 3) return null;

    const podium = standings.slice(0, 3);

    const code = (driver) => getDriverCode(driversInfo[driver] || {}, driver);

    const formatGap = (gap) => {
        if (!gap || gap === 'Leader') return '';
        return gap;
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center animate-fadeIn">
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 text-gray-400 hover:text-white text-2xl font-bold"
            >
                ×
            </button>

            <div className="text-center">
                {/* Checkered flag animation */}
                <div className="text-6xl mb-4 animate-bounce">🏁</div>

                <h1 className="text-4xl font-black text-white uppercase tracking-widest mb-2">
                    Race <span className="text-rbr-red">Complete</span>
                </h1>
                <p className="text-gray-400 text-sm mb-12 uppercase tracking-widest">Final Classification</p>

                {/* Podium */}
                <div className="flex items-end justify-center gap-4 mb-12">
                    {/* P2 */}
                    <div className="flex flex-col items-center">
                        <div className="relative mb-2">
                            {driversInfo[podium[1]?.Driver]?.HeadshotUrl ? (
                                <img
                                    src={driversInfo[podium[1]?.Driver]?.HeadshotUrl}
                                    alt={driversInfo[podium[1]?.Driver]?.LastName}
                                    className="w-20 h-20 rounded-full border-4 border-gray-400 object-cover"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full border-4 border-gray-400 bg-gray-800 flex items-center justify-center text-2xl font-bold text-white">
                                    {code(podium[1]?.Driver) || 'P2'}
                                </div>
                            )}
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-black font-black text-lg">
                                2
                            </div>
                        </div>
                        <div className="text-lg font-bold text-white">{code(podium[1]?.Driver)}</div>
                        <div className="text-xs text-gray-400">{driversInfo[podium[1]?.Driver]?.TeamName}</div>
                        <div className="text-xs text-gray-500 mt-1">{formatGap(podium[1]?.GapStr)}</div>
                        <div className="w-24 h-24 bg-gradient-to-t from-gray-500 to-gray-400 rounded-t-lg mt-4"></div>
                    </div>

                    {/* P1 */}
                    <div className="flex flex-col items-center">
                        <div className="relative mb-2">
                            {driversInfo[podium[0]?.Driver]?.HeadshotUrl ? (
                                <img
                                    src={driversInfo[podium[0]?.Driver]?.HeadshotUrl}
                                    alt={driversInfo[podium[0]?.Driver]?.LastName}
                                    className="w-24 h-24 rounded-full border-4 border-yellow-400 object-cover shadow-[0_0_30px_rgba(251,191,36,0.5)]"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full border-4 border-yellow-400 bg-gray-800 flex items-center justify-center text-3xl font-bold text-white shadow-[0_0_30px_rgba(251,191,36,0.5)]">
                                    {code(podium[0]?.Driver) || 'P1'}
                                </div>
                            )}
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-black font-black text-xl">
                                🏆
                            </div>
                        </div>
                        <div className="text-2xl font-black text-white uppercase">{driversInfo[podium[0]?.Driver]?.LastName}</div>
                        <div className="text-sm font-bold" style={{ color: driversInfo[podium[0]?.Driver]?.TeamColor }}>
                            {driversInfo[podium[0]?.Driver]?.TeamName}
                        </div>
                        <div className="text-xs text-rbr-yellow mt-1">WINNER</div>
                        <div className="w-28 h-32 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-lg mt-4"></div>
                    </div>

                    {/* P3 */}
                    <div className="flex flex-col items-center">
                        <div className="relative mb-2">
                            {driversInfo[podium[2]?.Driver]?.HeadshotUrl ? (
                                <img
                                    src={driversInfo[podium[2]?.Driver]?.HeadshotUrl}
                                    alt={driversInfo[podium[2]?.Driver]?.LastName}
                                    className="w-20 h-20 rounded-full border-4 border-orange-700 object-cover"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full border-4 border-orange-700 bg-gray-800 flex items-center justify-center text-2xl font-bold text-white">
                                    {code(podium[2]?.Driver) || 'P3'}
                                </div>
                            )}
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-orange-700 flex items-center justify-center text-white font-black text-lg">
                                3
                            </div>
                        </div>
                        <div className="text-lg font-bold text-white">{code(podium[2]?.Driver)}</div>
                        <div className="text-xs text-gray-400">{driversInfo[podium[2]?.Driver]?.TeamName}</div>
                        <div className="text-xs text-gray-500 mt-1">{formatGap(podium[2]?.GapStr)}</div>
                        <div className="w-24 h-20 bg-gradient-to-t from-orange-800 to-orange-700 rounded-t-lg mt-4"></div>
                    </div>
                </div>

                {/* Continue button */}
                <button
                    onClick={onClose}
                    className="bg-rbr-red hover:bg-red-700 text-white px-8 py-3 rounded font-bold uppercase tracking-wider transition-all hover:scale-105"
                >
                    View Full Results
                </button>
            </div>
        </div>
    );
};

export default PodiumDisplay;
