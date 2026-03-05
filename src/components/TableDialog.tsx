import { useState, memo } from 'react';

interface TableDialogProps {
  onInsert: (rows: number, cols: number) => void;
  onClose: () => void;
}

const TableDialog = memo(function TableDialog({ onInsert, onClose }: TableDialogProps) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background p-3 sm:p-4 rounded-lg shadow-xl w-full max-w-xs sm:max-w-sm border border-border">
        <h2 className="text-base sm:text-lg font-semibold mb-3 text-foreground">Insert Table</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Rows</label>
            <input
              type="number"
              min="1"
              max="20"
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Columns</label>
            <input
              type="number"
              min="1"
              max="10"
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onInsert(rows, cols)}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Insert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default TableDialog;
