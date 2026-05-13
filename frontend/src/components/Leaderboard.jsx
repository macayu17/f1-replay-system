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
  'MoneyGram Haas F1 Team': 'https://media.formula1.com/content/dam/fom-website/teams/2024/haas-logo.png.transform/2col/image.png',
  // Sauber/Kick Sauber/Alfa Romeo
  'Sauber': 'https://media.formula1.com/content/dam/fom-website/teams/2024/kick-sauber-logo.png.transform/2col/image.png',
  'Kick Sauber': 'https://media.formula1.com/content/dam/fom-website/teams/2024/kick-sauber-logo.png.transform/2col/image.png',
  'Alfa Romeo': 'https://media.formula1.com/content/dam/fom-website/teams/2024/kick-sauber-logo.png.transform/2col/image.png',
  // RB/AlphaTauri/Visa Cash App RB
  'RB': 'https://media.formula1.com/content/dam/fom-website/teams/2024/rb-logo.png.transform/2col/image.png',
  'Racing Bulls': 'https://media.formula1.com/content/dam/fom-website/teams/2024/rb-logo.png.transform/2col/image.png',
  'Visa Cash App Racing Bulls': 'https://media.formula1.com/content/dam/fom-website/teams/2024/rb-logo.png.transform/2col/image.png',
  'Visa Cash App RB': 'https://media.formula1.com/content/dam/fom-website/teams/2024/rb-logo.png.transform/2col/image.png',
  'VCARB': 'https://media.formula1.com/content/dam/fom-website/teams/2024/rb-logo.png.transform/2col/image.png',
  'AlphaTauri': 'https://media.formula1.com/content/dam/fom-website/teams/2024/rb-logo.png.transform/2col/image.png',
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
    <div className="velocity-panel velocity-mono flex h-full w-full flex-col overflow-hidden text-sm">
      <div className="terminal-pane-title z-10">
        <div className="flex items-center justify-between">
          <span className="velocity-label text-white">Leaderboard</span>
          <span className="text-[9px] font-medium uppercase text-[#f6a11a]">Live timing</span>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto">
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
            const hasPenalty = String(info?.Status || '').toUpperCase().includes('PEN') || String(driver?.GapStr || '').toUpperCase().includes('PEN');
            const isSelected = selectedDriver === driver.Driver;
            const isComparison = comparisonDriver === driver.Driver;

            let rowClass = `group relative flex h-9 cursor-pointer items-center overflow-hidden border-b border-[#f6a11a]/10 transition-all hover:bg-[#f6a11a]/10 ${isRetired ? 'opacity-50 grayscale' : ''}`;

            // Selection highlighting
            if (isSelected) {
              rowClass += " border-l-2 border-l-rbr-red bg-rbr-red/14";
            } else if (isComparison) {
              rowClass += " border-l-2 border-l-blue-500 bg-blue-500/14";
            }
            // Fastest lap highlighting (purple glow)
            else if (hasFastestLap) {
              rowClass += " border-l-2 border-l-purple-500 bg-purple-500/14 shadow-[0_0_10px_rgba(177,56,221,0.2)]";
            }
            // Podium Highlight
            else if (isFinished) {
              if (index === 0) rowClass += " border-l-2 border-l-yellow-500 bg-yellow-500/12";
              else if (index === 1) rowClass += " border-l-2 border-l-gray-400 bg-gray-400/10";
              else if (index === 2) rowClass += " border-l-2 border-l-orange-700 bg-orange-700/10";
              else rowClass += " border-l-2 border-l-green-900 bg-green-900/10";
            }

            return (
              <div
                key={driver.Driver}
                onClick={(e) => onDriverClick(driver.Driver, e)}
                className={rowClass}
              >
                {/* Hover Effect */}
                <div className="pointer-events-none absolute inset-0 bg-white/5 opacity-0 transition-opacity group-hover:opacity-100"></div>

                <div className={`w-7 text-center text-sm font-bold ${isFinished && index < 3 ? 'text-white' : 'text-white/70'}`}>
                  {index + 1}
                </div>

                {teamLogo && (
                  <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-sm bg-white/90 p-1 shadow-sm">
                    <img
                      src={teamLogo}
                      alt={teamName}
                      className="w-5 h-5 object-contain"
                    />
                  </div>
                )}

                <div
                  className="mr-2 flex h-5 w-8 items-center justify-center rounded-sm text-[10px] font-black text-white shadow-md"
                  style={{
                    backgroundColor: teamColor,
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  {info.DriverNumber || driver.Driver}
                </div>

                <div className="flex-1 min-w-0 font-semibold text-white flex items-center">
                  <span className="text-[12px] tracking-wide truncate">{info.Abbreviation || driver.Driver}</span>
                </div>

                <div className="mr-1 flex w-8 items-center justify-center gap-1">
                  {hasFastestLap && <span className="rounded bg-purple-600 px-1 text-[8px] font-bold leading-4 text-white">FL</span>}
                  {hasPenalty && <span className="rounded bg-rbr-yellow px-1 text-[9px] font-black leading-4 text-black">!</span>}
                </div>

                <div className={`mr-2 flex w-16 items-center justify-end text-right text-[11px] ${isRetired ? 'font-bold text-red-400' : 'text-white/55'}`}>
                  <span>{gap}</span>
                </div>

                {!isRetired && (
                  <div className={`mr-3 flex h-5 w-5 scale-90 items-center justify-center rounded-sm border ${tyreClass} text-[9px] font-bold shadow-sm`}>
                    {tyre === 'UNKNOWN' ? '?' : tyre[0]}
                  </div>
                )}
                {isRetired && (
                  <div className="mr-3 flex h-6 w-6 items-center justify-center text-xs font-bold text-red-500">
                    RET
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
