// src/components/ui/AppLogo/AppLogo.tsx
import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

/**
 * Logo aplikasi (four-leaf clover) - sama persis dengan public/favicon.svg, cuma
 * di-reimplement sebagai SvgIcon supaya bisa dipakai inline (AppBar, Login) dengan
 * sizing/margin yang konsisten dengan icon MUI lain. Outline putih dibungkus badge
 * lingkaran gelap (bukan currentColor/theme.primary) - tanpa badge ini logo hilang
 * total di background terang (light mode AppBar/Login pakai background.paper putih).
 */
export function AppLogo(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 100 100" {...props}>
      <circle cx="50" cy="50" r="48" fill="#0a0a0f" />
      <g transform="translate(50,50) scale(2.15)" fill="none" stroke="#FFFFFF" strokeWidth={1.6} strokeLinejoin="round">
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
