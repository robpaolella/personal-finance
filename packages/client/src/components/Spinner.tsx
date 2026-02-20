export default function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-3 border-[var(--table-border)] border-t-[#3b82f6] rounded-full animate-spin" />
    </div>
  );
}
