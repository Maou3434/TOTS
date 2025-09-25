import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Shield, Sword, Zap, Target, Crown, Axe } from 'lucide-react';

const classIcons = {
  warrior: Sword,
  mage: Zap,
  archer: Target,
  assassin: Shield,
  paladin: Crown,
  berserker: Axe
};

const classDescriptions = {
  warrior: "High health and defense, balanced damage",
  mage: "High mana and magical damage, low health",
  archer: "High speed and ranged damage",
  assassin: "High speed and critical hits, low health",
  paladin: "Balanced stats with healing abilities",
  berserker: "High attack but low defense"
};

export default function Auth() {
  const { session, signInWithTeam, signUpTeam, signInAsAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('team-login');

  // Team login form
  const [teamLoginData, setTeamLoginData] = useState({
    teamName: '',
    password: ''
  });

  // Team signup form
  const [teamSignupData, setTeamSignupData] = useState({
    teamName: '',
    password: '',
    characterClass: ''
  });

  // Admin login form
  const [adminData, setAdminData] = useState({
    username: '',
    password: ''
  });

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleTeamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signInWithTeam(teamLoginData.teamName, teamLoginData.password);
    
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

    if (!teamSignupData.characterClass) {
      toast({
        title: "Character class required",
        description: "Please select a character class",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signUpTeam(
      teamSignupData.teamName,
      teamSignupData.password,
      teamSignupData.characterClass
    );
    
    if (error) {
      toast({
        title: "Registration failed",
        description: error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Team created successfully!",
        description: "You can now log in with your team credentials"
      });
      setActiveTab('team-login');
    }

    setIsLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signInAsAdmin(adminData.username, adminData.password);
    
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
                    value={teamLoginData.teamName}
                    onChange={(e) => setTeamLoginData(prev => ({ ...prev, teamName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="team-password">Password</Label>
                  <Input
                    id="team-password"
                    type="password"
                    value={teamLoginData.password}
                    onChange={(e) => setTeamLoginData(prev => ({ ...prev, password: e.target.value }))}
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
                    value={teamSignupData.teamName}
                    onChange={(e) => setTeamSignupData(prev => ({ ...prev, teamName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new-team-password">Password</Label>
                  <Input
                    id="new-team-password"
                    type="password"
                    value={teamSignupData.password}
                    onChange={(e) => setTeamSignupData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="character-class">Character Class</Label>
                  <Select
                    value={teamSignupData.characterClass}
                    onValueChange={(value) => setTeamSignupData(prev => ({ ...prev, characterClass: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose your class" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(classDescriptions).map(([className, description]) => {
                        const Icon = classIcons[className as keyof typeof classIcons];
                        return (
                          <SelectItem key={className} value={className}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <div>
                                <div className="font-medium capitalize">{className}</div>
                                <div className="text-sm text-muted-foreground">{description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Team...' : 'Create Team'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin" className="space-y-4">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <Label htmlFor="admin-username">Username</Label>
                  <Input
                    id="admin-username"
                    value={adminData.username}
                    onChange={(e) => setAdminData(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={adminData.password}
                    onChange={(e) => setAdminData(prev => ({ ...prev, password: e.target.value }))}
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