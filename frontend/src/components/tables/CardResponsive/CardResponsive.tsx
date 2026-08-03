import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Stack from '@mui/material/Stack'
import { Card } from '@/components/ui'

// Untuk list kecil non-paginated (mis. toggle settings per grup) — desktop tabel
// HTML biasa yang mengalir dengan halaman (bukan DataGrid, tidak ada pagination/
// scroll internal per grup), mobile Stack<Card>. Pola ini sengaja DIPISAH dari
// ResponsiveListView (yang berbasis DataGrid, cocok untuk list panjang yang
// butuh pagination sungguhan) — dipakai DataGrid untuk list kecil bikin tiap
// grup jadi kotak sempit dengan scrollbar sendiri-sendiri.

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
  renderMobileCard: (row: T) => ReactNode
}

export function CardResponsive<T>({ rows, columns, getRowId, renderMobileCard }: CardResponsiveProps<T>) {
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

      <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
        {rows.map((row) => (
          <Card key={getRowId(row)} sx={{ p: 2 }}>
            {renderMobileCard(row)}
          </Card>
        ))}
      </Stack>
    </>
  )
}
