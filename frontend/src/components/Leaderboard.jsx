import React from 'react';

const TYRE_COLORS = {
  'SOFT': 'border-red-500 text-red-500',
  'MEDIUM': 'border-yellow-400 text-yellow-400',
  'HARD': 'border-white text-white',
  'INTERMEDIATE': 'border-green-500 text-green-500',
  'WET': 'border-blue-500 text-blue-500',
  'S': 'border-red-500 text-red-500',
  'M': 'border-yellow-400 text-yellow-400',
  'H': 'border-white text-white',
  'I': 'border-green-500 text-green-500',
  'W': 'border-blue-500 text-blue-500',
  'UNKNOWN': 'border-gray-500 text-gray-500'
};

const TEAM_LOGOS = {
  // Red Bull variants
  'Red Bull Racing': 'https://media.formula1.com/content/dam/fom-website/teams/2024/red-bull-racing-logo.png.transform/2col/image.png',
  'Red Bull': 'https://media.formula1.com/content/dam/fom-website/teams/2024/red-bull-racing-logo.png.transform/2col/image.png',
  // McLaren
  'McLaren': 'https://media.formula1.com/content/dam/fom-website/teams/2024/mclaren-logo.png.transform/2col/image.png',
  // Ferrari  
  'Ferrari': 'https://media.formula1.com/content/dam/fom-website/teams/2024/ferrari-logo.png.transform/2col/image.png',
  'Scuderia Ferrari': 'https://media.formula1.com/content/dam/fom-website/teams/2024/ferrari-logo.png.transform/2col/image.png',
  // Mercedes
  'Mercedes': 'https://media.formula1.com/content/dam/fom-website/teams/2024/mercedes-logo.png.transform/2col/image.png',
  // Aston Martin
  'Aston Martin': 'https://media.formula1.com/content/dam/fom-website/teams/2024/aston-martin-logo.png.transform/2col/image.png',
  // Alpine
  'Alpine': 'https://media.formula1.com/content/dam/fom-website/teams/2024/alpine-logo.png.transform/2col/image.png',
  // Williams
  'Williams': 'https://media.formula1.com/content/dam/fom-website/teams/2024/williams-logo.png.transform/2col/image.png',
  // Haas
  'Haas': 'https://media.formula1.com/content/dam/fom-website/teams/2024/haas-logo.png.transform/2col/image.png',
  'Haas F1 Team': 'https://media.formula1.com/content/dam/fom-website/teams/2024/haas-logo.png.transform/2col/image.png',
  // Sauber/Kick Sauber/Alfa Romeo
  'Sauber': 'https://media.formula1.com/content/dam/fom-website/teams/2024/kick-sauber-logo.png.transform/2col/image.png',
  'Kick Sauber': 'https://media.formula1.com/content/dam/fom-website/teams/2024/kick-sauber-logo.png.transform/2col/image.png',
  'Alfa Romeo': 'https://media.formula1.com/content/dam/fom-website/teams/2024/kick-sauber-logo.png.transform/2col/image.png',
  // RB/AlphaTauri/Visa Cash App RB
  'RB': 'https://media.formula1.com/content/dam/fom-website/teams/2024/rb-logo.png.transform/2col/image.png',
  'AlphaTauri': 'https://media.formula1.com/content/dam/fom-website/teams/2024/rb-logo.png.transform/2col/image.png',
  'Visa Cash App RB': 'https://media.formula1.com/content/dam/fom-website/teams/2024/rb-logo.png.transform/2col/image.png',
  'Scuderia AlphaTauri': 'https://media.formula1.com/content/dam/fom-website/teams/2024/rb-logo.png.transform/2col/image.png',
};

// Flexible team name matching function
const getTeamLogo = (teamName) => {
  if (!teamName) return null;
  const normalizedName = teamName.toLowerCase();

  // Direct key match first
  for (const [key, url] of Object.entries(TEAM_LOGOS)) {
    if (key.toLowerCase() === normalizedName) {
      return url;
    }
  }

  // Partial match (check if team name includes any key)
  for (const [key, url] of Object.entries(TEAM_LOGOS)) {
    if (normalizedName.includes(key.toLowerCase())) {
      return url;
    }
  }

  // Reverse partial match (check if any key includes team name)
  for (const [key, url] of Object.entries(TEAM_LOGOS)) {
    if (key.toLowerCase().includes(normalizedName)) {
      return url;
    }
  }

  return null;
};


const Leaderboard = ({ standings, driversInfo, onDriverClick, fastestLapDriver, selectedDriver, comparisonDriver }) => {
  return (
    <div className="bg-black/90 backdrop-blur-md rounded-lg border border-gray-700 w-full overflow-hidden font-mono text-sm shadow-2xl flex flex-col h-full">
      <div className="bg-gradient-to-r from-rbr-red to-red-900 text-white font-bold px-4 py-2 uppercase tracking-widest flex justify-between items-center shadow-md z-10">
        <span>Leaderboard</span>
        <span className="text-[10px] opacity-75 font-normal">LIVE TIMING • Shift+Click to compare</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        <div className="flex flex-col">
          {standings.map((driver, index) => {
            const info = driversInfo[driver.Driver] || {};
            const teamColor = info.TeamColor || '#FFFFFF';
            const teamName = info.TeamName || '';
            const teamLogo = getTeamLogo(teamName);
            const tyre = driver.Compound || 'UNKNOWN';
            const tyreClass = TYRE_COLORS[tyre.toUpperCase()] || TYRE_COLORS['UNKNOWN'];
            const isRetired = driver.Status === 'RET';
            const isFinished = driver.Status === 'FINISHED';
            const gap = index === 0 ? 'Leader' : (isRetired ? 'OUT' : driver.GapStr);
            const hasFastestLap = fastestLapDriver === driver.Driver;
            const isSelected = selectedDriver === driver.Driver;
            const isComparison = comparisonDriver === driver.Driver;

            let rowClass = `flex items-center h-10 border-b border-gray-800 hover:bg-gray-800 cursor-pointer transition-all group relative overflow-hidden ${isRetired ? 'opacity-50 grayscale' : ''}`;

            // Selection highlighting
            if (isSelected) {
              rowClass += " bg-rbr-red/20 border-l-4 border-l-rbr-red";
            } else if (isComparison) {
              rowClass += " bg-blue-500/20 border-l-4 border-l-blue-500";
            }
            // Fastest lap highlighting (purple glow)
            else if (hasFastestLap) {
              rowClass += " bg-purple-500/20 border-l-4 border-l-purple-500 shadow-[0_0_10px_rgba(177,56,221,0.3)]";
            }
            // Podium Highlight
            else if (isFinished) {
              if (index === 0) rowClass += " bg-yellow-500/20 border-l-4 border-l-yellow-500"; // Gold
              else if (index === 1) rowClass += " bg-gray-400/20 border-l-4 border-l-gray-400"; // Silver
              else if (index === 2) rowClass += " bg-orange-700/20 border-l-4 border-l-orange-700"; // Bronze
              else rowClass += " bg-green-900/20 border-l-4 border-l-green-900"; // Other finishers
            }

            return (
              <div
                key={driver.Driver}
                onClick={(e) => onDriverClick(driver.Driver, e)}
                className={rowClass}
              >
                {/* Hover Effect */}
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                {/* Position */}
                <div className={`w-10 text-center font-bold text-lg italic ${isFinished && index < 3 ? 'text-white scale-110' : 'text-gray-300'}`}>
                  {isFinished && index === 0 ? '🏆' : index + 1}
                </div>

                {/* Team Color Stripe */}
                <div className="w-1.5 h-6 rounded-full mr-2" style={{ backgroundColor: teamColor }}></div>

                {/* Team Logo OR Driver Number */}
                {teamLogo ? (
                  <div className="w-6 h-6 mr-2 flex items-center justify-center bg-white/10 rounded p-0.5">
                    <img src={teamLogo} alt={teamName} className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div
                    className="w-6 h-6 mr-2 flex items-center justify-center rounded text-[10px] font-black text-white"
                    style={{ backgroundColor: teamColor }}
                  >
                    {info.DriverNumber || '?'}
                  </div>
                )}

                {/* Driver Name */}
                <div className="flex-1 font-bold text-white truncate flex flex-col justify-center leading-tight">
                  <span className="text-sm tracking-wide">{info.Abbreviation || driver.Driver}</span>
                  <span className="text-[9px] text-gray-500 uppercase font-normal">{info.LastName}</span>
                </div>

                {/* Gap & Fastest Lap Badge */}
                <div className={`w-24 text-right text-xs mr-3 font-mono flex items-center justify-end gap-1 ${isRetired ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                  {hasFastestLap && <span className="bg-purple-600 text-white text-[8px] px-1 rounded font-bold animate-pulse">FL</span>}
                  <span>{gap}</span>
                </div>

                {/* Tyre */}
                {!isRetired && (
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full border-2 ${tyreClass} text-[10px] font-bold mr-3 scale-90 shadow-sm`}>
                    {tyre === 'UNKNOWN' ? '?' : tyre[0]}
                  </div>
                )}
                {isRetired && (
                  <div className="w-6 h-6 flex items-center justify-center mr-3 text-red-600 font-bold text-xs">
                    ❌
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
