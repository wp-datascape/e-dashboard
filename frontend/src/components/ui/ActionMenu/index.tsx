import { useState, type ReactNode } from 'react'
import { styled, alpha } from '@mui/material/styles'
import MuiButton from '@mui/material/Button'
import Menu, { type MenuProps } from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import ListItemText from '@mui/material/ListItemText'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { useTranslation } from 'react-i18next'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ActionMenuItemDef {
  label: string
  icon?: ReactNode
  onClick: () => void
  color?: 'error' | 'warning' | 'success' | 'info'
  dividerBefore?: boolean
  hidden?: boolean
  disabled?: boolean
}

export interface ActionMenuProps {
  items: ActionMenuItemDef[]
  label?: string
}

// ─── Styled Menu ─────────────────────────────────────────────────────────────

const StyledMenu = styled((props: MenuProps) => (
  <Menu
    elevation={0}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    {...props}
  />
))(({ theme }) => ({
  '& .MuiPaper-root': {
    borderRadius: 6,
    marginTop: theme.spacing(1),
    minWidth: 180,
    boxShadow:
      'rgb(255,255,255) 0px 0px 0px 0px, rgba(0,0,0,0.05) 0px 0px 0px 1px, rgba(0,0,0,0.1) 0px 10px 15px -3px, rgba(0,0,0,0.05) 0px 4px 6px -2px',
    '& .MuiMenu-list': { padding: '4px 0' },
    '& .MuiMenuItem-root': {
      '& .MuiSvgIcon-root': {
        fontSize: 18,
        color: theme.palette.text.secondary,
        marginRight: theme.spacing(1.5),
        ...theme.applyStyles('dark', { color: 'inherit' }),
      },
      '&:active': {
        backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
      },
    },
    ...theme.applyStyles('dark', { color: theme.palette.grey[300] }),
  },
}))

// ─── Component ────────────────────────────────────────────────────────────────

export function ActionMenu({ items, label }: ActionMenuProps) {
  const { t } = useTranslation()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    setAnchorEl(e.currentTarget)
  }
  const handleClose = () => setAnchorEl(null)

  const visible = items.filter((item) => !item.hidden)

  return (
    <>
      <MuiButton
        size="small"
        variant="outlined"
        disableElevation
        endIcon={<KeyboardArrowDownIcon />}
        onClick={handleOpen}
        aria-haspopup="true"
        aria-expanded={open}
        sx={{ fontSize: '0.75rem', py: 0.25, px: 1, minWidth: 0 }}
      >
        {label ?? t('common.actions')}
      </MuiButton>

      <StyledMenu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {visible.map((item, idx) => (
          <span key={idx}>
            {item.dividerBefore && <Divider sx={{ my: 0.5 }} />}
            <MenuItem
              onClick={() => { handleClose(); item.onClick() }}
              disableRipple
              disabled={item.disabled}
              sx={
                item.color
                  ? { color: `${item.color}.main`, '& .MuiSvgIcon-root': { color: `${item.color}.main` } }
                  : undefined
              }
            >
              {item.icon}
              <ListItemText primary={item.label} />
            </MenuItem>
          </span>
        ))}
      </StyledMenu>
    </>
  )
}
