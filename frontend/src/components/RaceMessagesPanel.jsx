const RaceMessagesPanel = ({ recentMessages }) => {
  return (
    <div className="bg-gray-900/80 border border-gray-700 rounded p-3 backdrop-blur-sm flex flex-col h-40 shrink-0">
      <h3 className="text-rbr-red text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-rbr-red animate-pulse"></span>
        Race Control & Radio
      </h3>
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 pr-1 space-y-2">
        {recentMessages.length === 0 && <div className="text-gray-500 text-[10px] italic">No active messages</div>}
        {recentMessages.map((msg) => (
          <div key={`${msg.type}-${msg.Time}-${msg.Driver || 'na'}-${msg.Message?.slice(0, 20) || ''}`} className={`text-[10px] border-l-2 pl-2 py-0.5 ${msg.type === 'TR' ? 'border-blue-500' : 'border-gray-600'}`}>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-gray-500 font-mono mr-1">{new Date(msg.Time * 1000).toISOString().substr(11, 8)}</span>
              {msg.type === 'TR' && <span className="text-blue-400 font-bold bg-blue-900/30 px-1 rounded">{msg.Driver}</span>}
              {msg.type === 'RC' && <span className="text-gray-500 font-bold bg-gray-800 px-1 rounded">RC</span>}
            </div>
            <span className="text-white leading-tight block">{msg.Message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RaceMessagesPanel
