import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LogOut, Sword, Shield, Zap, Heart, Star, Package } from 'lucide-react';

interface Dungeon {
  id: string;
  name: string;
  rank: string;
  description: string;
  min_level: number;
}

interface InventoryItem {
  id: string;
  item_type: string;
  item_name: string;
  rarity: string;
  description: string;
  stats: any;
  obtained_at: string;
}

interface DungeonAttempt {
  id: string;
  dungeon_id: string;
  status: string;
  attempted_at: string;
  dungeons: { name: string };
}

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'legendary': return 'text-legendary';
    case 'epic': return 'text-epic';
    case 'rare': return 'text-rare';
    case 'uncommon': return 'text-uncommon';
    default: return 'text-common';
  }
};

const getRankColor = (rank: string) => {
  switch (rank) {
    case 'S': return 'text-rank-s bg-rank-s/10';
    case 'A': return 'text-rank-a bg-rank-a/10';
    case 'B': return 'text-rank-b bg-rank-b/10';
    case 'C': return 'text-rank-c bg-rank-c/10';
    case 'D': return 'text-rank-d bg-rank-d/10';
    default: return 'text-rank-e bg-rank-e/10';
  }
};

export default function TeamDashboard() {
  const { team, signOut } = useAuth();
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [attempts, setAttempts] = useState<DungeonAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch dungeons
      const { data: dungeonsData } = await supabase
        .from('dungeons')
        .select('*')
        .order('min_level');

      // Fetch inventory
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('*')
        .eq('team_id', team?.id)
        .order('obtained_at', { ascending: false });

      // Fetch attempts
      const { data: attemptsData } = await supabase
        .from('dungeon_attempts')
        .select('*, dungeons(name)')
        .eq('team_id', team?.id)
        .order('attempted_at', { ascending: false });

      setDungeons(dungeonsData || []);
      setInventory(inventoryData || []);
      setAttempts(attemptsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const attemptDungeon = async (dungeonId: string) => {
    try {
      const { error } = await supabase
        .from('dungeon_attempts')
        .insert({
          team_id: team?.id,
          dungeon_id: dungeonId,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Dungeon attempt submitted!",
        description: "Your request is pending admin approval"
      });

      fetchData(); // Refresh data
    } catch (error) {
      toast({
        title: "Failed to attempt dungeon",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your adventure...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return <div>Team data not found</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary">⚔️ {team.team_name}</h1>
            <p className="text-muted-foreground capitalize">Level {team.level} {team.character_class}</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Character Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sword className="h-5 w-5" />
              Character Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Heart className="h-6 w-6 mx-auto mb-2 text-red-500" />
                <p className="font-semibold">Health</p>
                <p className="text-2xl font-bold">{team.health}</p>
              </div>
              <div className="text-center">
                <Zap className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <p className="font-semibold">Mana</p>
                <p className="text-2xl font-bold">{team.mana}</p>
              </div>
              <div className="text-center">
                <Sword className="h-6 w-6 mx-auto mb-2 text-red-600" />
                <p className="font-semibold">Attack</p>
                <p className="text-2xl font-bold">{team.attack}</p>
              </div>
              <div className="text-center">
                <Shield className="h-6 w-6 mx-auto mb-2 text-gray-500" />
                <p className="font-semibold">Defense</p>
                <p className="text-2xl font-bold">{team.defense}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between mb-2">
                <span>Experience</span>
                <span>{team.experience}/100</span>
              </div>
              <Progress value={team.experience} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Available Dungeons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🏰 Available Dungeons
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dungeons.map((dungeon) => {
                const canAttempt = team.level >= dungeon.min_level;
                const hasPendingAttempt = attempts.some(
                  attempt => attempt.dungeon_id === dungeon.id && attempt.status === 'pending'
                );

                return (
                  <div key={dungeon.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{dungeon.name}</h3>
                        <p className="text-sm text-muted-foreground">{dungeon.description}</p>
                        <p className="text-sm">Min Level: {dungeon.min_level}</p>
                      </div>
                      <Badge className={getRankColor(dungeon.rank)}>
                        Rank {dungeon.rank}
                      </Badge>
                    </div>
                    <Button
                      onClick={() => attemptDungeon(dungeon.id)}
                      disabled={!canAttempt || hasPendingAttempt}
                      className="w-full"
                      variant={canAttempt ? "default" : "secondary"}
                    >
                      {hasPendingAttempt ? 'Pending Approval' : 
                       canAttempt ? 'Attempt Dungeon' : 
                       `Requires Level ${dungeon.min_level}`}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory ({inventory.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {inventory.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No items yet. Complete dungeons to earn rewards!
                </p>
              ) : (
                inventory.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className={`font-semibold ${getRarityColor(item.rarity)}`}>
                          {item.item_name}
                        </h4>
                        <p className="text-sm text-muted-foreground capitalize">
                          {item.item_type.replace('_', ' ')} • {item.rarity}
                        </p>
                        {item.description && (
                          <p className="text-sm mt-1">{item.description}</p>
                        )}
                      </div>
                      <Badge variant="outline">
                        {new Date(item.obtained_at).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Attempts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Dungeon Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No dungeon attempts yet. Start your adventure above!
              </p>
            ) : (
              <div className="space-y-3">
                {attempts.slice(0, 5).map((attempt) => (
                  <div key={attempt.id} className="flex justify-between items-center border rounded-lg p-3">
                    <div>
                      <p className="font-medium">{attempt.dungeons.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(attempt.attempted_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={
                      attempt.status === 'approved' ? 'default' :
                      attempt.status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {attempt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}