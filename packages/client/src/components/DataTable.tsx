interface Column<T> {
  label: string;
  key: string;
  align?: 'left' | 'right';
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string | number;
}

export default function DataTable<T>({ columns, data, onRowClick, rowKey }: DataTableProps<T>) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              className={`text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.04em] px-2.5 py-2 border-b-2 border-[var(--table-border)] ${
                col.align === 'right' ? 'text-right' : 'text-left'
              }`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr
            key={rowKey(row)}
            onClick={() => onRowClick?.(row)}
            className={`border-b border-[var(--table-row-border)] ${onRowClick ? 'cursor-pointer' : ''} hover:bg-[var(--bg-hover)]`}
          >
            {columns.map((col) => (
              <td
                key={col.key}
                className={`px-2.5 py-2 text-[13px] text-[var(--text-body)] ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.render
                  ? col.render(row)
                  : String((row as Record<string, unknown>)[col.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
