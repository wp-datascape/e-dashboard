// Daftar banner pengumuman dismissible (task032) - tambah banner baru cukup
// tambah 1 entry di sini + konten di i18n/locales/{id,en}/announcements.json,
// TANPA ubah komponen/halaman. `key` harus unik & stabil selamanya - dipakai
// sebagai penanda "sudah dilihat" per user (lihat hooks/useMe.ts), ganti key
// berarti banner dianggap baru lagi oleh SEMUA user.
export interface AnnouncementDef {
  key: string
  titleKey: string
  bodyKey: string
  ctaLabelKey?: string
  ctaTo?: string
}

export const ANNOUNCEMENTS: AnnouncementDef[] = [
  {
    key: 'help-intro-v1',
    titleKey: 'announcements.helpIntro.title',
    bodyKey: 'announcements.helpIntro.body',
    ctaLabelKey: 'announcements.helpIntro.cta',
    ctaTo: '/help',
  },
]
