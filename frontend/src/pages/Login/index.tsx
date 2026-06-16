import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

// MUI & Components
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { AppAlert } from '@/components/ui/Alert'; // Pastikan path ini benar

// Logic Hooks
import { useLoginMutation } from '@/hooks/useAuth';

// Schema Validation
const createLoginSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().min(1, t('auth.validation.email_required')).email(t('auth.validation.email_invalid')),
    password: z.string().min(6, t('auth.validation.password_min')),
  });

type LoginFormInput = z.infer<ReturnType<typeof createLoginSchema>>;

export default function Login() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  
  // State untuk menangani popup error
  const [errorInfo, setErrorInfo] = useState({ open: false, title: '', message: '' });
  
  const { mutate: login, isPending } = useLoginMutation();

  const { control, handleSubmit } = useForm<LoginFormInput>({
    resolver: zodResolver(createLoginSchema(t)),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (data: LoginFormInput) => {
    login(data, {
      onError: (err: any) => {
        // Trigger popup saat terjadi error
        setErrorInfo({ 
          open: true, 
          title: 'Login Gagal', 
          message: err.message || 'Terjadi kesalahan saat login.' 
        });
      }
    });
  };

  return (
    <Box sx={{ 
      backgroundColor: 'grey.50', 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      py: 4 
    }}>
      <Container maxWidth="sm">
        <Card sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
            {t('auth.loginTitle')}
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 2 }}>
            <TextField
              control={control}
              name="email"
              label={t('auth.email')}
              autoComplete="email"
              autoFocus
              disabled={isPending}
              fullWidth
              sx={{ mb: 2 }}
            />

            <TextField
              control={control}
              name="password"
              label={t('auth.password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={isPending}
              fullWidth
              sx={{ mb: 2 }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button 
              type="submit" 
              isLoading={isPending} 
              fullWidth 
              size="large" 
              variant="contained"
              sx={{ mt: 2 }}
            >
              {t('auth.login')}
            </Button>
          </Box>
        </Card>

        {/* Komponen Alert (Popup Dialog) */}
        <AppAlert 
          open={errorInfo.open} 
  title={errorInfo.title} 
  message={errorInfo.message} 
  onClose={() => setErrorInfo({ open: false, title: '', message: '' })} 
/>
      </Container>
    </Box>
  );
}