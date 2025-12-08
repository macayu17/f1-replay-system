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
    'Red Bull Racing': 'https://upload.wikimedia.org/wikipedia/en/4/41/Oracle_Red_Bull_Racing_logo.svg',
    'McLaren': 'https://upload.wikimedia.org/wikipedia/en/6/66/McLaren_Racing_logo.svg',
    'Ferrari': 'https://upload.wikimedia.org/wikipedia/en/c/c0/Scuderia_Ferrari_Logo.svg',
    'Mercedes': 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Mercedes_AMG_Petronas_F1_Logo.svg',
    'Aston Martin': 'https://upload.wikimedia.org/wikipedia/en/b/bd/Aston_Martin_Lagonda_brand_logo.svg',
    'Alpine': 'https://upload.wikimedia.org/wikipedia/en/2/26/Alpine_F1_Team_Logo.svg',
    'Williams': 'https://upload.wikimedia.org/wikipedia/en/3/39/Williams_F1_logo_2020.svg',
    'Haas F1 Team': 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Haas_F1_Team_logo.svg',
    'Kick Sauber': 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Kick_Sauber_logo.svg',
    'RB': 'https://upload.wikimedia.org/wikipedia/en/2/2b/Visa_Cash_App_RB_Formula_One_Team_Logo.svg',
    'AlphaTauri': 'https://upload.wikimedia.org/wikipedia/en/2/2b/Visa_Cash_App_RB_Formula_One_Team_Logo.svg',
    'Alfa Romeo': 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Kick_Sauber_logo.svg'
};

const Leaderboard = ({ standings, driversInfo, onDriverClick }) => {
  return (
    <div className="bg-black/90 backdrop-blur-md rounded-lg border border-gray-700 w-full overflow-hidden font-mono text-sm shadow-2xl flex flex-col h-full">
      <div className="bg-gradient-to-r from-rbr-red to-red-900 text-white font-bold px-4 py-2 uppercase tracking-widest flex justify-between items-center shadow-md z-10">
        <span>Leaderboard</span>
        <span className="text-[10px] opacity-75 font-normal">LIVE TIMING</span>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        <div className="flex flex-col">
          {standings.map((driver, index) => {
            const info = driversInfo[driver.Driver] || {};
            const teamColor = info.TeamColor || '#FFFFFF';
            const teamName = info.TeamName || '';
            const teamLogo = TEAM_LOGOS[Object.keys(TEAM_LOGOS).find(k => teamName.includes(k))] || null;
            const tyre = driver.Compound || 'UNKNOWN';
            const tyreClass = TYRE_COLORS[tyre.toUpperCase()] || TYRE_COLORS['UNKNOWN'];
            const isRetired = driver.Status === 'RET';
            const isFinished = driver.Status === 'FINISHED';
            const gap = index === 0 ? 'Leader' : (isRetired ? 'OUT' : driver.GapStr);

            let rowClass = `flex items-center h-10 border-b border-gray-800 hover:bg-gray-800 cursor-pointer transition-all group relative overflow-hidden ${isRetired ? 'opacity-50 grayscale' : ''}`;
            
            // Podium Highlight
            if (isFinished) {
                if (index === 0) rowClass += " bg-yellow-500/20 border-l-4 border-l-yellow-500"; // Gold
                else if (index === 1) rowClass += " bg-gray-400/20 border-l-4 border-l-gray-400"; // Silver
                else if (index === 2) rowClass += " bg-orange-700/20 border-l-4 border-l-orange-700"; // Bronze
                else rowClass += " bg-green-900/20 border-l-4 border-l-green-900"; // Other finishers
            }

            return (
              <div 
                key={driver.Driver}
                onClick={() => onDriverClick(driver.Driver)}
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
                
                {/* Team Logo */}
                {teamLogo && (
                    <div className="w-6 h-6 mr-2 flex items-center justify-center bg-white/10 rounded p-0.5">
                        <img src={teamLogo} alt={teamName} className="max-w-full max-h-full object-contain" />
                    </div>
                )}

                {/* Driver Name */}
                <div className="flex-1 font-bold text-white truncate flex flex-col justify-center leading-tight">
                  <span className="text-sm tracking-wide">{info.Abbreviation || driver.Driver}</span>
                  <span className="text-[9px] text-gray-500 uppercase font-normal">{info.LastName}</span>
                </div>
                
                {/* Gap */}
                <div className={`w-20 text-right text-xs mr-3 font-mono ${isRetired ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                  {gap}
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
