import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import type { Components } from 'react-markdown'

interface MarkdownContentProps {
  content: string
}

// Lebar baca nyaman, dipakai konsisten di semua elemen teks supaya panjang
// baris tidak berlebihan di layar lebar.
const READ_WIDTH = 720

// Data (JSON) -> format konten (Markdown) -> rendering (react-markdown) ->
// styling (mapping di bawah). Komponen ini murni lapisan rendering + styling,
// tidak pernah menyimpan teks sendiri.
const components: Components = {
  h1: ({ children }) => (
    <Typography variant="h5" component="h2" sx={{ fontWeight: 700, maxWidth: READ_WIDTH, mt: 3, mb: 1.5, '&:first-of-type': { mt: 0 } }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, maxWidth: READ_WIDTH, mt: 3, mb: 1, '&:first-of-type': { mt: 0 } }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="subtitle2" component="h4" sx={{ fontWeight: 700, maxWidth: READ_WIDTH, mt: 2, mb: 1 }}>
      {children}
    </Typography>
  ),
  p: ({ children }) => (
    <Typography
      variant="body1"
      component="p"
      color="text.secondary"
      sx={{ textAlign: 'justify', lineHeight: 1.75, maxWidth: READ_WIDTH, mb: 2 }}
    >
      {children}
    </Typography>
  ),
  strong: ({ children }) => (
    <Box component="strong" sx={{ fontWeight: 700, color: 'text.primary' }}>
      {children}
    </Box>
  ),
  em: ({ children }) => (
    <Box component="em" sx={{ fontStyle: 'italic' }}>
      {children}
    </Box>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={{ maxWidth: READ_WIDTH, m: 0, mb: 2, pl: 3, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ maxWidth: READ_WIDTH, m: 0, mb: 2, pl: 3, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Typography component="li" variant="body1" color="text.secondary" sx={{ textAlign: 'justify', lineHeight: 1.75, pl: 0.5 }}>
      {children}
    </Typography>
  ),
  a: ({ href, children }) => (
    <Link href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </Link>
  ),
  blockquote: ({ children }) => (
    <Box
      sx={{
        maxWidth: READ_WIDTH,
        borderLeft: '3px solid',
        borderColor: 'divider',
        pl: 2,
        py: 0.25,
        mb: 2,
        color: 'text.secondary',
        fontStyle: 'italic',
        textAlign: 'justify',
      }}
    >
      {children}
    </Box>
  ),
  pre: ({ children }) => (
    <Box
      component="pre"
      sx={{
        maxWidth: READ_WIDTH,
        overflowX: 'auto',
        bgcolor: 'action.hover',
        p: 1.5,
        borderRadius: 1,
        mb: 2,
        fontFamily: 'monospace',
        fontSize: '0.875rem',
      }}
    >
      {children}
    </Box>
  ),
  code: ({ children }) => (
    <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
      {children}
    </Box>
  ),
  table: ({ children }) => (
    <TableContainer sx={{ maxWidth: READ_WIDTH, mb: 2, overflowX: 'auto' }}>
      <Table size="small">{children}</Table>
    </TableContainer>
  ),
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => <TableCell sx={{ fontWeight: 700 }}>{children}</TableCell>,
  td: ({ children }) => <TableCell sx={{ color: 'text.secondary' }}>{children}</TableCell>,
}

// Render satu string Markdown sebagai dokumen: heading, paragraf rata
// kiri-kanan, list, tabel, blockquote, dan kode, semua dari struktur Markdown
// itu sendiri, bukan ditulis di komponen ini.
export default function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </Markdown>
  )
}
