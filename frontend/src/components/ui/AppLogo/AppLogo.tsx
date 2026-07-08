// src/components/ui/AppLogo/AppLogo.tsx
import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

/**
 * Logo aplikasi (four-leaf clover) - sama persis dengan public/favicon.svg, cuma
 * di-reimplement sebagai SvgIcon supaya bisa dipakai inline (AppBar, Login) dengan
 * sizing/margin yang konsisten dengan icon MUI lain.
 *
 * Murni outline putih (fill="none" di semua elemen) - lingkaran DAN bentuk semanggi
 * cuma garis tepi, tidak ada fill solid apapun. Transparan penuh di background
 * apapun ini duduk di atasnya.
 */
export function AppLogo(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 100 100" {...props}>
      <circle cx="50" cy="50" r="46" fill="none" stroke="#FFFFFF" strokeWidth={3} />
      <g
        transform="translate(50,50) scale(2.15)"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1.6}
        strokeLinejoin="round"
      >
        <g transform="rotate(0) translate(-12,-21.35)">
          <path d="M12,21.35 l-1.45,-1.32 C5.4,15.36 2,12.28 2,8.5 C2,5.42 4.42,3 7.5,3 c1.74,0 3.41,0.81 4.5,2.09 C13.09,3.81 14.76,3 16.5,3 C19.58,3 22,5.42 22,8.5 c0,3.78 -3.4,6.86 -8.55,11.54 L12,21.35 z" />
        </g>
        <g transform="rotate(90) translate(-12,-21.35)">
          <path d="M12,21.35 l-1.45,-1.32 C5.4,15.36 2,12.28 2,8.5 C2,5.42 4.42,3 7.5,3 c1.74,0 3.41,0.81 4.5,2.09 C13.09,3.81 14.76,3 16.5,3 C19.58,3 22,5.42 22,8.5 c0,3.78 -3.4,6.86 -8.55,11.54 L12,21.35 z" />
        </g>
        <g transform="rotate(180) translate(-12,-21.35)">
          <path d="M12,21.35 l-1.45,-1.32 C5.4,15.36 2,12.28 2,8.5 C2,5.42 4.42,3 7.5,3 c1.74,0 3.41,0.81 4.5,2.09 C13.09,3.81 14.76,3 16.5,3 C19.58,3 22,5.42 22,8.5 c0,3.78 -3.4,6.86 -8.55,11.54 L12,21.35 z" />
        </g>
        <g transform="rotate(270) translate(-12,-21.35)">
          <path d="M12,21.35 l-1.45,-1.32 C5.4,15.36 2,12.28 2,8.5 C2,5.42 4.42,3 7.5,3 c1.74,0 3.41,0.81 4.5,2.09 C13.09,3.81 14.76,3 16.5,3 C19.58,3 22,5.42 22,8.5 c0,3.78 -3.4,6.86 -8.55,11.54 L12,21.35 z" />
        </g>
      </g>
    </SvgIcon>
  );
}
