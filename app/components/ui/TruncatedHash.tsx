'use client';

interface TruncatedHashProps {
  hash: string;
  startLength?: number;
  endLength?: number;
  className?: string;
  showCopy?: boolean;
  externalLink?: string;
}

export function TruncatedHash({ 
  hash, 
  startLength = 6, 
  endLength = 4, 
  className = 'font-mono text-sm text-zinc-500',
  showCopy = true,
  externalLink
}: TruncatedHashProps) {
  if (!hash) return null;

  const truncated = `${hash.slice(0, startLength)}...${hash.slice(-endLength)}`;

  const copyToClipboard = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    // Could add toast here
  };

  const Content = () => (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span>{truncated}</span>
      {showCopy && (
        <button 
          onClick={copyToClipboard}
          className="p-1 hover:bg-zinc-100 rounded transition-colors text-zinc-400 hover:text-zinc-600"
          title="Copy full hash"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      )}
    </div>
  );

  if (externalLink) {
    return (
      <a 
        href={externalLink} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="hover:underline decoration-zinc-300 underline-offset-2"
      >
        <Content />
      </a>
    );
  }

  return <Content />;
}
