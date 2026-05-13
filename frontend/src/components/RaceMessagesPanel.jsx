const RaceMessagesPanel = ({ recentMessages }) => {
  return (
    <div className="velocity-panel flex h-40 shrink-0 flex-col p-3">
      <h3 className="velocity-label mb-2 flex items-center gap-2 text-rbr-red">
        <span className="h-1.5 w-1.5 animate-pulse bg-rbr-red"></span>
        Race Control & Radio
      </h3>
      <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto pr-1">
        {recentMessages.length === 0 && <div className="velocity-mono text-[10px] text-white/40">No active messages</div>}
        {recentMessages.map((msg) => (
          <div key={`${msg.type}-${msg.Time}-${msg.Driver || 'na'}-${msg.Message?.slice(0, 20) || ''}`} className={`border-l-2 py-0.5 pl-2 text-[10px] ${msg.type === 'TR' ? 'border-blue-500' : 'border-white/25'}`}>
            <div className="flex justify-between items-center mb-0.5">
              <span className="velocity-mono mr-1 text-white/40">{new Date(msg.Time * 1000).toISOString().substr(11, 8)}</span>
              {msg.type === 'TR' && <span className="rounded bg-blue-900/30 px-1 font-bold text-blue-300">{msg.Driver}</span>}
              {msg.type === 'RC' && <span className="rounded bg-white/10 px-1 font-bold text-white/55">RC</span>}
            </div>
            <span className="text-white leading-tight block">{msg.Message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RaceMessagesPanel
