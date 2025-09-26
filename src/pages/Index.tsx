import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sword, Shield, Zap, Crown, Users, Trophy, BookOpen } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            🏰 Trials Of The Shadow Sovereign
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Form your team, choose your class, and conquer legendary dungeons to earn epic rewards. 
            Your adventure awaits in the depths below!
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8 py-4">
                <Sword className="mr-2 h-5 w-5" />
                Begin Your Adventure
              </Button>
            </Link>
            <Link to="/game-data">
              <Button size="lg" variant="outline" className="text-lg px-8 py-4">
                <BookOpen className="mr-2 h-5 w-5" />
                Game Guide
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Form Your Team</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Register your team and choose from 6 unique character classes, each with distinct abilities and playstyles.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Conquer Dungeons</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Challenge dungeons ranked from E to S difficulty. Each victory brings you closer to legendary status.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader className="text-center">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Earn Epic Loot</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center">
                Receive rare skills, artifacts, and set pieces. Build your legendary collection and grow in power.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Classes Preview */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Choose Your Destiny</CardTitle>
            <p className="text-muted-foreground">Six unique classes await your command</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <Sword className="h-8 w-8 mx-auto text-fighter" />
                <h3 className="font-semibold">Fighter</h3>
                <p className="text-sm text-muted-foreground">A master of combat, dealing high damage.</p>
              </div>
              <div className="text-center space-y-2">
                <Shield className="h-8 w-8 mx-auto text-tank" />
                <h3 className="font-semibold">Tank</h3>
                <p className="text-sm text-muted-foreground">A stalwart defender, absorbing damage for the team.</p>
              </div>
              <div className="text-center space-y-2">
                <div className="h-8 w-8 mx-auto bg-healer rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">H</span>
                </div>
                <h3 className="font-semibold">Healer</h3>
                <p className="text-sm text-muted-foreground">A supportive class that can heal and buff allies.</p>
              </div>
              <div className="text-center space-y-2">
                <div className="h-8 w-8 mx-auto bg-assassin rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">A</span>
                </div>
                <h3 className="font-semibold">Assassin</h3>
                <p className="text-sm text-muted-foreground">A swift and deadly class that strikes from the shadows.</p>
              </div>
              <div className="text-center space-y-2">
                <Zap className="h-8 w-8 mx-auto text-mage" />
                <h3 className="font-semibold">Mage</h3>
                <p className="text-sm text-muted-foreground">A powerful spellcaster with devastating area-of-effect attacks.</p>
              </div>
              <div className="text-center space-y-2">
                <div className="h-8 w-8 mx-auto bg-ranger rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">R</span>
                </div>
                <h3 className="font-semibold">Ranger</h3>
                <p className="text-sm text-muted-foreground">A master of ranged combat, picking off enemies from a distance.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
