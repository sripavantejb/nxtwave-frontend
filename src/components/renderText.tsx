import MathBlock from './MathBlock'

export function renderText(text: string) {
  if (!text) return null
  
  // Normalize escaped newlines from API (e.g., "\\n") to actual newlines
  const normalized = text.replace(/\\n/g, '\n')
  
  // Split by newlines first to handle line breaks
  const lines = normalized.split('\n')
  
  return (
    <>
      {lines.map((line, lineIdx) => {
        // Process each line for math blocks - match $...$ patterns (including nested content)
        // Use a more robust regex that handles edge cases
        const parts = line.split(/(\$[^$]*\$)/g).filter(part => part !== '')
        
        return (
          <span key={`line-${lineIdx}`} style={{ whiteSpace: 'pre-wrap' }}>
            {parts.map((part, partIdx) => {
              const uniqueKey = `line-${lineIdx}-part-${partIdx}`
              // Check if this part is a LaTeX expression (starts and ends with $)
              if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
                const mathContent = part.slice(1, -1).trim()
                // Only render as math if there's actual content
                if (mathContent) {
                  return <MathBlock key={uniqueKey} math={mathContent} inline={true} />
                }
              }
              // Render as regular text (preserves all text content)
              return <span key={uniqueKey}>{part}</span>
            })}
            {lineIdx < lines.length - 1 && <br key={`br-${lineIdx}`} />}
          </span>
        )
      })}
    </>
  )
}


