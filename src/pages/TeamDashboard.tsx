import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LogOut, Sword, Shield, Zap, Heart, Star, Package, Users } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

interface Dungeon {
  id: string;
  name: string;
  rank: string;
  description: string;
  min_level: number;
}

type InventoryItem = Database['public']['Tables']['inventory']['Row'];
type Player = Database['public']['Tables']['players']['Row'];

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
  const { team, signOut, loading: authLoading } = useAuth();
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [attempts, setAttempts] = useState<DungeonAttempt[]>([]);

  useEffect(() => {
    if (team) {
      fetchData();
    }
  }, [team]);

  const fetchData = async () => {
    if (!team) return;
    try {
      // Fetch dungeons
      const { data: dungeonsData } = await supabase
        .from('dungeons')
        .select('*')
        .order('min_level');

      // Fetch inventory
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('*', { count: 'exact' })
        .eq('team_id', team.id)
        .order('obtained_at', { ascending: false });

      // Fetch attempts
      const { data: attemptsData } = await supabase
        .from('dungeon_attempts')
        .select('*, dungeons(name)')
        .eq('team_id', team.id)
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

  if (authLoading) {
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
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Team Stats & Players */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Roster
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {team.players.map(player => (
                <Card key={player.id} className="p-4">
                  <CardHeader className="p-0 mb-2">
                    <CardTitle className="text-lg">{player.name}</CardTitle>
                    <p className="text-sm text-muted-foreground capitalize">{player.character_class}</p>
                  </CardHeader>
                  <CardContent className="p-0 text-sm space-y-1">
                    <p><Heart className="inline h-4 w-4 mr-2 text-red-500" />{player.health} HP</p>
                    <p><Zap className="inline h-4 w-4 mr-2 text-blue-500" />{player.mana} MP</p>
                    <p><Sword className="inline h-4 w-4 mr-2 text-gray-600" />{player.attack} ATK</p>
                    <p><Shield className="inline h-4 w-4 mr-2 text-gray-400" />{player.defense} DEF</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-4 text-center">
              <p className="font-semibold">Team Stamina: <span className="text-primary font-bold">{team.stamina}</span></p>
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
                const canAttempt = true; // Removed level check
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