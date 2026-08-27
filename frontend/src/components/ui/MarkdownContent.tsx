import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
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

// ─── Tabel responsive (mobile: kartu label-di-atas-nilai-di-bawah, bukan
// scroll-horizontal) ────────────────────────────────────────────────────────
//
// Header kolom didapat dengan menelusuri POHON REACT yang sudah dirender
// (thead -> tr -> th), lalu ditempel sebagai atribut `data-label` ke tiap
// <td> lewat cloneElement - SEMUA murni transformasi saat render, TIDAK
// pakai ref/context (aturan lint proyek ini eksplisit melarang baca/tulis
// ref.current selama render, lihat react-hooks/refs). CSS di MarkdownTable
// yang menampilkan data-label itu sbg label di layar sempit.
function childrenToText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(childrenToText).join('')
  if (isValidElement(node)) return childrenToText((node.props as { children?: ReactNode }).children)
  return ''
}

function elementChildren(node: ReactNode): ReactElement[] {
  return Children.toArray(node).filter(isValidElement)
}

function extractHeaderLabels(theadEl: ReactElement | undefined): string[] {
  if (!theadEl) return []
  const [headerRow] = elementChildren((theadEl.props as { children?: ReactNode }).children)
  if (!headerRow) return []
  return elementChildren((headerRow.props as { children?: ReactNode }).children).map((cell) =>
    childrenToText((cell.props as { children?: ReactNode }).children),
  )
}

function withDataLabels(tbodyEl: ReactElement | undefined, headers: string[]): ReactElement | null {
  if (!tbodyEl) return null
  const rows = elementChildren((tbodyEl.props as { children?: ReactNode }).children)
  const labeledRows = rows.map((row) => {
    const cells = elementChildren((row.props as { children?: ReactNode }).children)
    const labeledCells = cells.map((cell, i) =>
      cloneElement(cell as ReactElement<Record<string, unknown>>, { 'data-label': headers[i] ?? '' }),
    )
    return cloneElement(row, { key: row.key }, labeledCells)
  })
  return cloneElement(tbodyEl, { key: tbodyEl.key }, labeledRows)
}

function MarkdownTable({ children }: { children?: ReactNode }) {
  const [theadEl, tbodyEl] = elementChildren(children)
  const headers = extractHeaderLabels(theadEl)
  const labeledTbody = withDataLabels(tbodyEl, headers)

  return (
    <TableContainer sx={{ mb: 2 }}>
      <Table
        size="small"
        sx={(theme) => ({
          [theme.breakpoints.down('sm')]: {
            '& thead': { display: 'none' },
            '& tbody tr': {
              display: 'block',
              mb: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 1.5,
              '&:last-of-type': { mb: 0 },
            },
            // Label DI ATAS, nilai DI BAWAH, dua-duanya rata kiri - bukan pola
            // "label kiri, nilai rata kanan" (cuma cocok utk nilai pendek 1
            // baris; begitu isinya paragraf/kode yang wrap, rata kanan bikin
            // teks zigzag dan susah dibaca).
            '& tbody td': {
              display: 'block',
              textAlign: 'left',
              border: 'none',
              p: 0,
              '&:not(:first-of-type)': { mt: 1.25 },
            },
            '& tbody td::before': {
              content: 'attr(data-label)',
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: theme.palette.text.secondary,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              mb: 0.5,
            },
          },
        })}
      >
        {theadEl}
        {labeledTbody}
      </Table>
    </TableContainer>
  )
}

// Data (JSON) -> format konten (Markdown) -> rendering (react-markdown) ->
// styling (mapping di bawah). Komponen ini murni lapisan rendering + styling,
// tidak pernah menyimpan teks sendiri.
//
// Sengaja TIDAK ada maxWidth per elemen di sini - lebar teks ikut lebar
// kontainer pembungkus (Card/Accordion di halaman pemanggil), konsisten
// dengan pola halaman lain di app ini (tidak ada satu pun yang membatasi
// lebar baca artifisial). Percobaan sebelumnya (maxWidth tetap di tiap
// elemen teks) meninggalkan kotak kosong menganga di kanan pada layar
// lebar karena kontainer luarnya tetap full-width.
const components: Components = {
  h1: ({ children }) => (
    <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mt: 3, mb: 1.5, '&:first-of-type': { mt: 0 } }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, mt: 3, mb: 1, '&:first-of-type': { mt: 0 } }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="subtitle2" component="h4" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
      {children}
    </Typography>
  ),
  p: ({ children }) => (
    <Typography
      variant="body1"
      component="p"
      color="text.secondary"
      sx={{ textAlign: 'justify', lineHeight: 1.75, mb: 2 }}
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
    <Box component="ul" sx={{ m: 0, mb: 2, pl: 3, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ m: 0, mb: 2, pl: 3, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
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
    <Box
      component="code"
      sx={{
        fontFamily: 'monospace',
        fontSize: '0.85em',
        bgcolor: 'action.hover',
        borderRadius: 0.5,
        px: 0.75,
        py: 0.25,
      }}
    >
      {children}
    </Box>
  ),
  table: MarkdownTable,
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => <TableCell sx={{ fontWeight: 700 }}>{children}</TableCell>,
  // `data-label` disuntik lewat cloneElement di withDataLabels() di atas -
  // react-markdown TETAP memanggil fungsi ini sebagai komponen `td` asli,
  // jadi prop ekstra itu HARUS diteruskan eksplisit ke <TableCell> di sini,
  // kalau tidak dibuang diam-diam (destructuring cuma ambil `children`).
  td: (props) => {
    const dataLabel = (props as unknown as Record<string, unknown>)['data-label'] as string | undefined
    return (
      <TableCell data-label={dataLabel} sx={{ color: 'text.secondary' }}>
        {props.children}
      </TableCell>
    )
  },
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
