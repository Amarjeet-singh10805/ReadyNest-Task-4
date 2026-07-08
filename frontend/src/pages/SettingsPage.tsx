import { motion } from 'framer-motion';
import { Settings, Moon, Sun, Bell, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/store/theme';

export function SettingsPage() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-5 w-5" />
          <h1 className="text-xl font-bold">Settings</h1>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription>Customize how SyncSpace looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  <div>
                    <p className="text-sm font-medium">Theme</p>
                    <p className="text-xs text-muted-foreground">{theme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled'}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={toggleTheme}>
                  Switch to {theme === 'dark' ? 'light' : 'dark'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notifications</CardTitle>
              <CardDescription>Control what you're notified about</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4" />
                  <div>
                    <p className="text-sm font-medium">In-app notifications</p>
                    <p className="text-xs text-muted-foreground">Workspace invites and activity</p>
                  </div>
                </div>
                <span className="text-xs bg-green-500/15 text-green-600 dark:text-green-400 rounded-full px-2 py-0.5 font-medium">Enabled</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Security</CardTitle>
              <CardDescription>Authentication and access settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">JWT Authentication</p>
                  <p className="text-xs text-muted-foreground">Sessions expire after 7 days. Tokens rotate automatically.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
