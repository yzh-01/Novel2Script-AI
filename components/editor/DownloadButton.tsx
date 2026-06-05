// ============================================================
// DownloadButton — 下载 .yaml 文件
// ============================================================

'use client';

import { memo, useCallback } from 'react';

interface DownloadButtonProps {
  yaml: string;
  filename?: string;
  disabled?: boolean;
}

export const DownloadButton = memo(function DownloadButton({
  yaml,
  filename = 'screenplay.yaml',
  disabled = false,
}: DownloadButtonProps) {
  const handleDownload = useCallback(() => {
    const blob = new Blob([yaml], { type: 'application/x-yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [yaml, filename]);

  return (
    <button
      onClick={handleDownload}
      disabled={disabled || !yaml.trim()}
      className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white
                 transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-gray-300"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 12L3 7h3V3h4v4h3L8 12zM2 14h12v1H2v-1z"/>
      </svg>
      下载 YAML
    </button>
  );
});
