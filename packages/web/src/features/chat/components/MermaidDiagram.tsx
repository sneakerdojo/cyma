import { useEffect, useRef, useState, useCallback, useId } from 'react';
import mermaid from 'mermaid';
import { Maximize2, X } from 'lucide-react';

export interface MermaidDiagramProps {
  title?: string;
  mermaidCode: string;
  expandable?: boolean;
}

// Initialise mermaid once with Octio dark-theme tokens.
// Re-initialising on every render is wasteful (SRP + performance concern).
let mermaidInitialised = false;

function ensureMermaidInit() {
  if (mermaidInitialised) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      // Octio brand colours
      background: '#06060C',
      mainBkg: '#0E0E18',
      nodeBorder: '#1E1E30',
      lineColor: '#7A7A8C',
      primaryColor: '#0E0E18',
      primaryBorderColor: '#E8862A',
      primaryTextColor: '#F0EDE8',
      secondaryColor: '#161625',
      secondaryBorderColor: '#1E1E30',
      secondaryTextColor: '#7A7A8C',
      tertiaryColor: '#06060C',
      tertiaryBorderColor: '#1E1E30',
      tertiaryTextColor: '#7A7A8C',
      edgeLabelBackground: '#06060C',
      clusterBkg: '#0E0E18',
      titleColor: '#F0EDE8',
      fontFamily: 'DM Sans, sans-serif',
    },
  });
  mermaidInitialised = true;
}

/**
 * MermaidDiagram — renders a Mermaid diagram inline with an optional
 * full-screen expand overlay.  Falls back to a <pre> block if mermaid
 * fails to parse the code.
 */
export default function MermaidDiagram({
  title,
  mermaidCode,
  expandable = true,
}: MermaidDiagramProps) {
  const uid = useId().replace(/:/g, '');
  const containerId = `mermaid-${uid}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [renderError, setRenderError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      ensureMermaidInit();
      try {
        // mermaid.render returns { svg } in v10+ / v11+
        const { svg: rendered } = await mermaid.render(containerId, mermaidCode);
        if (!cancelled) {
          setSvg(rendered);
          setRenderError(false);
        }
      } catch {
        if (!cancelled) setRenderError(true);
      }
    }

    render();
    return () => { cancelled = true; };
  }, [containerId, mermaidCode]);

  const handleExpandToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    },
    [],
  );

  const DiagramContent = ({ large = false }: { large?: boolean }) => (
    <>
      {renderError ? (
        <pre className="text-xs text-text-muted overflow-auto whitespace-pre-wrap break-all font-mono leading-relaxed">
          {mermaidCode}
        </pre>
      ) : svg ? (
        <div
          ref={large ? undefined : containerRef}
          className={large ? 'w-full' : 'w-full overflow-auto'}
          // Safe: mermaid output is sanitised SVG — no user-controlled HTML
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        // Skeleton while rendering
        <div className="w-full h-24 rounded-lg bg-surface-2 animate-pulse" />
      )}
    </>
  );

  return (
    <>
      {/* Inline card */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3 animate-fade-up">
        {title && (
          <p className="text-sm font-bold font-display text-orange">{title}</p>
        )}

        <DiagramContent />

        {expandable && !renderError && svg && (
          <button
            type="button"
            onClick={handleExpandToggle}
            aria-label="Expand diagram"
            className="self-end flex items-center gap-1 text-[11px] text-text-muted hover:text-orange transition-colors"
          >
            <Maximize2 size={12} />
            Tap to expand
          </button>
        )}
      </div>

      {/* Full-screen overlay */}
      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title ?? 'Diagram'}
          onKeyDown={handleKeyDown}
          className="fixed inset-0 z-[200] flex flex-col bg-bg/95 backdrop-blur-sm p-6 overflow-auto animate-fade-in"
        >
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            {title && (
              <p className="text-base font-bold font-display text-orange">{title}</p>
            )}
            <button
              type="button"
              onClick={handleExpandToggle}
              autoFocus
              aria-label="Close expanded diagram"
              className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-orange/40 transition-all bg-surface ml-auto"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-auto">
            <div className="max-w-4xl w-full">
              <DiagramContent large />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
