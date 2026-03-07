function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    "Selesai": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    "Closed": "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
    "Sedang Dikerjakan": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "Direncanakan": "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
    "Open": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    "Menunggu Review": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    "Tertunda": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    "Overdue": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${variants[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    "High": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    "Medium": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    "Low": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[level] || "bg-muted text-muted-foreground"}`}>
      {level}
    </span>
  );
}

export { StatusBadge, RiskBadge };
