import React from 'react';

const PodiumDisplay = ({ standings, driversInfo, isRaceFinished, onClose }) => {
    if (!isRaceFinished || standings.length < 3) return null;

    const podium = standings.slice(0, 3);

    const formatGap = (gap) => {
        if (!gap || gap === 'Leader') return '';
        return gap;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fadeIn">
            <button
                type="button"
                onClick={onClose}
                className="velocity-button secondary absolute right-6 top-6 h-10 w-10 text-sm"
                aria-label="Close final classification"
            >
                X
            </button>

            <div className="velocity-panel is-hot w-full max-w-5xl p-6 text-center md:p-10">
                <div className="velocity-label mb-4 text-rbr-red">Final Classification</div>
                <h1 className="mb-2 text-4xl font-display font-bold uppercase text-white md:text-6xl">
                    Race <span className="text-rbr-red">Complete</span>
                </h1>
                <p className="velocity-mono mb-12 text-sm uppercase text-white/50">Podium result locked from official standings</p>

                <div className="mb-12 flex items-end justify-center gap-4">
                    <div className="flex flex-col items-center">
                        <div className="relative mb-2">
                            {driversInfo[podium[1]?.Driver]?.HeadshotUrl ? (
                                <img
                                    src={driversInfo[podium[1]?.Driver]?.HeadshotUrl}
                                    alt={driversInfo[podium[1]?.Driver]?.LastName}
                                    className="h-20 w-20 rounded-full border-4 border-gray-400 object-cover"
                                />
                            ) : (
                                <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-gray-400 bg-gray-800 text-2xl font-bold text-white">
                                    {driversInfo[podium[1]?.Driver]?.Abbreviation || '2'}
                                </div>
                            )}
                            <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center bg-gray-400 text-lg font-black text-black">
                                2
                            </div>
                        </div>
                        <div className="text-lg font-bold text-white">{driversInfo[podium[1]?.Driver]?.Abbreviation}</div>
                        <div className="text-xs text-white/55">{driversInfo[podium[1]?.Driver]?.TeamName}</div>
                        <div className="mt-1 text-xs text-white/40">{formatGap(podium[1]?.GapStr)}</div>
                        <div className="mt-4 h-24 w-24 bg-gradient-to-t from-gray-500 to-gray-400"></div>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="relative mb-2">
                            {driversInfo[podium[0]?.Driver]?.HeadshotUrl ? (
                                <img
                                    src={driversInfo[podium[0]?.Driver]?.HeadshotUrl}
                                    alt={driversInfo[podium[0]?.Driver]?.LastName}
                                    className="h-24 w-24 rounded-full border-4 border-rbr-red object-cover shadow-[0_0_30px_rgba(255,24,1,0.42)]"
                                />
                            ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-rbr-red bg-gray-800 text-3xl font-bold text-white shadow-[0_0_30px_rgba(255,24,1,0.42)]">
                                    {driversInfo[podium[0]?.Driver]?.Abbreviation || '1'}
                                </div>
                            )}
                            <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center bg-rbr-red text-xl font-black text-white">
                                1
                            </div>
                        </div>
                        <div className="text-2xl font-black text-white uppercase">{driversInfo[podium[0]?.Driver]?.LastName}</div>
                        <div className="text-sm font-bold" style={{ color: driversInfo[podium[0]?.Driver]?.TeamColor }}>
                            {driversInfo[podium[0]?.Driver]?.TeamName}
                        </div>
                        <div className="mt-1 text-xs text-rbr-red">WINNER</div>
                        <div className="mt-4 h-32 w-28 bg-gradient-to-t from-red-950 to-rbr-red"></div>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="relative mb-2">
                            {driversInfo[podium[2]?.Driver]?.HeadshotUrl ? (
                                <img
                                    src={driversInfo[podium[2]?.Driver]?.HeadshotUrl}
                                    alt={driversInfo[podium[2]?.Driver]?.LastName}
                                    className="h-20 w-20 rounded-full border-4 border-rbr-yellow object-cover"
                                />
                            ) : (
                                <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-rbr-yellow bg-gray-800 text-2xl font-bold text-white">
                                    {driversInfo[podium[2]?.Driver]?.Abbreviation || '3'}
                                </div>
                            )}
                            <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center bg-rbr-yellow text-lg font-black text-black">
                                3
                            </div>
                        </div>
                        <div className="text-lg font-bold text-white">{driversInfo[podium[2]?.Driver]?.Abbreviation}</div>
                        <div className="text-xs text-white/55">{driversInfo[podium[2]?.Driver]?.TeamName}</div>
                        <div className="mt-1 text-xs text-white/40">{formatGap(podium[2]?.GapStr)}</div>
                        <div className="mt-4 h-20 w-24 bg-gradient-to-t from-orange-950 to-rbr-yellow"></div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="velocity-button px-8 py-3"
                >
                    View Full Results
                </button>
            </div>
        </div>
    );
};

export default PodiumDisplay;
