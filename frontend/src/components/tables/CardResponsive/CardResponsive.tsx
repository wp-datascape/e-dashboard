import { useState, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

// Untuk list kecil non-paginated (mis. toggle settings per grup) — desktop tabel
// HTML biasa yang mengalir dengan halaman (bukan DataGrid, tidak ada pagination/
// scroll internal per grup), mobile Accordion exclusive-open (satu card kebuka
// otomatis nutup yang lain — pola sama dengan ResponsiveListView/AutoCard,
// lihat CardExpandState di situ). Pola ini sengaja DIPISAH dari ResponsiveListView
// (yang berbasis DataGrid, cocok untuk list panjang yang butuh pagination
// sungguhan) — dipakai DataGrid untuk list kecil bikin tiap grup jadi kotak
// sempit dengan scrollbar sendiri-sendiri.
//
// AccordionSummary CUMA boleh berisi konten non-interaktif (render-nya sendiri
// adalah <button>) — kalau ada IconButton/ActionMenu di kolom manapun, taruh
// kolom itu di AccordionDetails (bukan renderMobileTitle), supaya tidak
// <button> bersarang di <button> (HTML invalid, lihat catatan di
// ResponsiveListView.tsx soal bug yang sama).

export interface CardResponsiveColumn<T> {
  key: string
  header: string
  width?: string
  render: (row: T) => ReactNode
}

export interface CardResponsiveProps<T> {
  rows: T[]
  columns: CardResponsiveColumn<T>[]
  getRowId: (row: T) => string | number
  /** Konten yang tampil di header accordion mobile (selalu kelihatan, sebelum
   *  di-expand) — default: render kolom pertama. HARUS non-interaktif. */
  renderMobileTitle?: (row: T) => ReactNode
  /** Konten yang tampil setelah accordion di-expand. */
  renderMobileDetails: (row: T) => ReactNode
}

export function CardResponsive<T>({
  rows, columns, getRowId, renderMobileTitle, renderMobileDetails,
}: CardResponsiveProps<T>) {
  const [expandedId, setExpandedId] = useState<string | number | null>(null)
  const title = renderMobileTitle ?? ((row: T) => columns[0]?.render(row))

  return (
    <>
      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} sx={{ fontWeight: 600, width: col.width }}>
                  {col.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={getRowId(row)} hover>
                {columns.map((col) => (
                  <TableCell key={col.key}>{col.render(row)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
        {rows.map((row) => {
          const id = getRowId(row)
          const expanded = expandedId === id
          return (
            <Accordion
              key={id}
              expanded={expanded}
              onChange={() => setExpandedId((cur) => (cur === id ? null : id))}
              disableGutters
              square={false}
              sx={{
                mb: 1.5,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 'none',
                overflow: 'hidden',
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ minWidth: 0, overflow: 'hidden' }}>{title(row)}</Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>{renderMobileDetails(row)}</AccordionDetails>
            </Accordion>
          )
        })}
      </Box>
    </>
  )
}
