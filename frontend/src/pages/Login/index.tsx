import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

// MUI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { Card } from '@/components/ui';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { AppLogo } from '@/components/ui/AppLogo';

// UI Components
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { AppAlert } from '@/components/ui/Alert';

// Logic Hooks
import { useLoginMutation } from '@/hooks/useAuth';
import { getApiErrorMessage } from '@/utils/apiError';

// Schema Validation
const createLoginSchema = (t: (key: string) => string) =>
  z.object({
    email: z
      .string()
      .min(1, t('auth.validation.email_required'))
      .email(t('auth.validation.email_invalid')),
    password: z.string().min(6, t('auth.validation.password_min')),
  });

type LoginFormInput = z.infer<ReturnType<typeof createLoginSchema>>;

export default function Login() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [errorInfo, setErrorInfo] = useState({ open: false, title: '', message: '' });

  const { mutate: login, isPending } = useLoginMutation();

  const { control, handleSubmit } = useForm<LoginFormInput>({
    resolver: zodResolver(createLoginSchema(t)),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (data: LoginFormInput) => {
    login(data, {
      // EDASHBOARD-599: sebelumnya SELALU pakai pesan generic apa pun kode
      // error dari backend (mis. ACCOUNT_LOCKED, RATE_LIMITED) — user tidak
      // pernah tahu akun terkunci/berapa lama harus menunggu. getApiErrorMessage
      // resolve lewat error code + i18n (pola sama komponen lain), fallback ke
      // pesan generic kalau kodenya tidak dikenali.
      onError: (error) => {
        setErrorInfo({
          open: true,
          title: t('auth.loginFailedTitle'),
          message: getApiErrorMessage(error, t),
        });
      },
    });
  };

  const year = new Date().getFullYear();

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 400,
          p: { xs: 3, sm: 4 },
        }}
      >
        {/* Brand Logo — vertikal: logo di atas, nama app di bawah, rata tengah */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 3 }}>
          {/* AppLogo murni outline putih (tanpa fill) - transparan, hilang total kalau
              langsung ditaruh di atas card putih (Login pakai background.paper, putih
              di light mode). Beda dari AppBar yang backgroundnya selalu gelap/berwarna
              secara alami. Bungkus lingkaran gelap KHUSUS di sini saja, bukan di
              AppLogo.tsx sendiri (AppBar tidak butuh ini). */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: '50%',
              bgcolor: '#0a0a0f',
            }}
          >
            <AppLogo sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            variant="body1"
            sx={{
              color: 'primary.main',
              fontWeight: 700,
              fontSize: '1.1rem',
              textAlign: 'center',
            }}
          >
            {t('common.appName')}
          </Typography>
        </Box>

        {/* Title */}
        <Typography
          variant="h4"
          sx={{
            color: 'text.primary',
            fontWeight: 700,
            mb: 3,
            textAlign: 'center',
          }}
        >
          {t('auth.loginTitle')}
        </Typography>

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Email Field */}
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', fontWeight: 500, mb: 0.75 }}
          >
            {t('auth.email')}
          </Typography>
          <TextField
            control={control}
            name="email"
            autoComplete="email"
            autoFocus
            disabled={isPending}
            fullWidth
            placeholder={t('auth.emailPlaceholder')}
            sx={{
              mb: 2.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
                bgcolor: 'background.default',
                '& fieldset': { borderColor: 'divider' },
                '&:hover fieldset': { borderColor: 'text.disabled' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                '& input': { color: 'text.primary' },
              },
            }}
          />

          {/* Password Field */}
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', fontWeight: 500, mb: 0.75 }}
          >
            {t('auth.password')}
          </Typography>
          <TextField
            control={control}
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            disabled={isPending}
            fullWidth
            placeholder="••••••"
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
                bgcolor: 'background.default',
                '& fieldset': { borderColor: 'divider' },
                '&:hover fieldset': { borderColor: 'text.disabled' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                '& input': { color: 'text.primary' },
              },
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: 'text.disabled' }}
                    >
                      {showPassword ? (
                        <VisibilityOff fontSize="small" />
                      ) : (
                        <Visibility fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Remember Me */}
          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                size="small"
                sx={{
                  color: 'text.disabled',
                  '&.Mui-checked': { color: 'primary.main' },
                  borderRadius: 0,
                  p: 0.5,
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('auth.rememberMe')}
              </Typography>
            }
            sx={{ mb: 2.5, ml: 0 }}
          />

          {/* Sign In Button */}
          <Button
            type="submit"
            isLoading={isPending}
            fullWidth
            size="large"
            variant="contained"
            sx={{
              borderRadius: 0,
              fontWeight: 700,
              fontSize: '0.95rem',
              py: 1.5,
            }}
          >
            {t('auth.loginButton')}
          </Button>
        </Box>

        {/* Copyright — di dalam card, bawah tombol Sign In (bukan footer halaman) */}
        <Typography
          variant="caption"
          sx={{ display: 'block', color: 'text.disabled', textAlign: 'center', mt: 3 }}
        >
          {t('common.copyright', { year })}
        </Typography>
      </Card>

      {/* Error Alert Dialog */}
      <AppAlert
        open={errorInfo.open}
        title={errorInfo.title}
        message={errorInfo.message}
        onClose={() => setErrorInfo({ open: false, title: '', message: '' })}
      />
    </Box>
  );
}
