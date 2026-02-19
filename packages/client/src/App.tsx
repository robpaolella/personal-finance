export default function App() {
  return (
    <div className="flex h-screen bg-surface font-sans">
      <div className="w-[220px] bg-sidebar flex flex-col shrink-0">
        <div className="p-5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent to-positive flex items-center justify-center">
              <span className="text-white text-sm font-extrabold font-mono">$</span>
            </div>
            <span className="text-gray-100 text-base font-bold tracking-tight">Ledger</span>
          </div>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          <span className="text-text-muted text-xs px-3 py-2">Loading...</span>
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto p-7 px-9">
        <h1 className="text-[22px] font-bold text-text-primary">Welcome to Ledger</h1>
        <p className="text-text-secondary text-sm mt-1">Your personal finance tracker is ready.</p>
      </div>
    </div>
  );
}
