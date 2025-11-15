import MathBlock from './MathBlock'

export function renderText(text: string) {
  if (!text) return null
  
  // Step 1: Handle all possible newline representations
  // Replace literal \n string sequences (not escape sequences) with actual newlines
  let normalized = text
    .replace(/\\n/g, '\n')           // Escaped newlines from JSON
    .replace(/\r\n/g, '\n')          // Windows line endings
    .replace(/\r/g, '\n')            // Old Mac line endings
  
  // Step 2: Clean up LaTeX expressions BEFORE splitting into lines
  // Remove newlines and extra whitespace from within $...$ blocks
  normalized = normalized.replace(/\$([^$]+)\$/g, (_match, latexContent) => {
    // Remove all types of newlines and collapse whitespace in LaTeX
    const cleanedLatex = latexContent
      .replace(/[\n\r]+/g, ' ')      // Replace newlines with space
      .replace(/\s+/g, ' ')          // Collapse multiple spaces
      .replace(/\\n/g, ' ')          // Remove any remaining literal \n
      .trim()                        // Remove leading/trailing space
    return `$${cleanedLatex}$`
  })
  
  // Step 3: One more pass to catch any stray escaped newlines
  normalized = normalized.replace(/\\n/g, '\n')
  
  // Step 4: Split into lines for rendering (supports literal "\\n" still lingering)
  const lines = normalized.split(/\n|\\n/g)
  
  return (
    <>
      {lines.map((line, lineIdx) => {
        // Skip completely empty lines but render a <br> for spacing
        if (line.trim() === '') {
          return <br key={`empty-${lineIdx}`} />
        }
        
        // Process each line for math blocks - match $...$ patterns
        const parts = line.split(/(\$[^$]+\$)/g).filter(part => part !== '')
        
        return (
          <span key={`line-${lineIdx}`} style={{ whiteSpace: 'pre-wrap' }}>
            {parts.map((part, partIdx) => {
              const uniqueKey = `line-${lineIdx}-part-${partIdx}`
              // Check if this part is a LaTeX expression (starts and ends with $)
              if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
                // KaTeX doesn't support the Unicode Rupee symbol.
                // Replace it inside LaTeX segments to prevent console warnings.
                const mathContent = part.slice(1, -1).trim().replace(/₹/g, 'Rs.')
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

export function renderTextWithMath(text: string) {
  return renderText(text)
}