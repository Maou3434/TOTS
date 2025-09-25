import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export default function Auth() {
  const { session, signInWithTeam, signUpTeam, signInAsAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('team-login');
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    teamLogin: { teamName: '', password: '' },
    teamSignup: { teamName: '', password: '' },
    adminLogin: { username: '', password: '' },
  });

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleInputChange = (form: 'teamLogin' | 'teamSignup' | 'adminLogin', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [form]: {
        ...prev[form],
        [field]: value,
      }
    }));
  };

  const handleTeamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { teamName, password } = formData.teamLogin;
    const { error } = await signInWithTeam(teamName, password);
    
    if (error) {
      toast({
        title: "Login failed",
        description: error,
        variant: "destructive"
      });
    }

    setIsLoading(false);
  };

  const handleTeamSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { teamName, password } = formData.teamSignup;
    const { data, error } = await signUpTeam(teamName, password);
    
    if (error) {
      toast({
        title: "Registration failed",
        description: error,
        variant: "destructive"
      });
    } else if (data) {
      toast({
        title: "Team created!",
        description: "Now, let's assemble your members."
      });
      navigate(`/add-members/${data.id}`);
    }

    setIsLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { username, password } = formData.adminLogin;
    const { error } = await signInAsAdmin(username, password);
    
    if (error) {
      toast({
        title: "Admin login failed",
        description: error,
        variant: "destructive"
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            🏰 Trials Of The Shadow Sovereign
          </CardTitle>
          <p className="text-muted-foreground">Choose your adventure</p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="team-login">Login</TabsTrigger>
              <TabsTrigger value="team-signup">Register</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>

            <TabsContent value="team-login" className="space-y-4">
              <form onSubmit={handleTeamLogin} className="space-y-4">
                <div>
                  <Label htmlFor="team-name">Team Name</Label>
                  <Input
                    id="team-name"
                    value={formData.teamLogin.teamName}
                    onChange={(e) => handleInputChange('teamLogin', 'teamName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="team-password">Password</Label>
                  <Input
                    id="team-password"
                    type="password"
                    value={formData.teamLogin.password}
                    onChange={(e) => handleInputChange('teamLogin', 'password', e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Logging in...' : 'Enter Dungeon'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="team-signup" className="space-y-4">
              <form onSubmit={handleTeamSignup} className="space-y-4">
                <div>
                  <Label htmlFor="new-team-name">Team Name</Label>
                  <Input
                    id="new-team-name"
                    value={formData.teamSignup.teamName}
                    onChange={(e) => handleInputChange('teamSignup', 'teamName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new-team-password">Password</Label>
                  <Input
                    id="new-team-password"
                    type="password"
                    value={formData.teamSignup.password}
                    onChange={(e) => handleInputChange('teamSignup', 'password', e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Team...' : 'Next: Add Members'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin" className="space-y-4">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <Label htmlFor="admin-username">Username</Label>
                  <Input
                    id="admin-username"
                    value={formData.adminLogin.username}
                    onChange={(e) => handleInputChange('adminLogin', 'username', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={formData.adminLogin.password}
                    onChange={(e) => handleInputChange('adminLogin', 'password', e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Logging in...' : 'Admin Access'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}