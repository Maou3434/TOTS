import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LogOut, CheckCircle, XCircle, Clock, Crown } from 'lucide-react';

interface PendingAttempt {
  id: string;
  team_id: string;
  dungeon_id: string;
  status: string;
  attempted_at: string;
  teams: {
    team_name: string;
    character_class: string;
    level: number;
  };
  dungeons: {
    name: string;
    rank: string;
  };
}

// Game data for drop generation
const skillsByClass = {
  warrior: ['Shield Bash', 'Berserker Rage', 'Taunt', 'Cleave', 'Iron Will'],
  mage: ['Fireball', 'Ice Shard', 'Lightning Bolt', 'Teleport', 'Mana Shield'],
  archer: ['Multi-Shot', 'Piercing Arrow', 'Eagle Eye', 'Trap', 'Wind Arrow'],
  assassin: ['Stealth', 'Poison Blade', 'Shadow Strike', 'Smoke Bomb', 'Critical Hit'],
  paladin: ['Heal', 'Divine Protection', 'Smite', 'Blessing', 'Holy Light'],
  berserker: ['Rage', 'Blood Lust', 'Intimidate', 'Whirlwind', 'Fury']
};

const artifacts = [
  'Ring of Power', 'Amulet of Wisdom', 'Boots of Speed', 'Gloves of Strength',
  'Cloak of Shadows', 'Crown of Kings', 'Belt of Giants', 'Bracers of Defense'
];

const sets = [
  'Dragon Scale Armor', 'Phoenix Feather Set', 'Shadow Walker Garb', 'Celestial Robes',
  'Berserker\'s Fury', 'Archmage Vestments', 'Ranger\'s Pride', 'Assassin\'s Edge'
];

const rarities = [
  { name: 'common', weight: 50 },
  { name: 'uncommon', weight: 30 },
  { name: 'rare', weight: 15 },
  { name: 'epic', weight: 4 },
  { name: 'legendary', weight: 1 }
];

const getRandomRarity = () => {
  const totalWeight = rarities.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const rarity of rarities) {
    random -= rarity.weight;
    if (random <= 0) return rarity.name;
  }
  return 'common';
};

const generateRandomDrop = (characterClass: string, dungeonRank: string) => {
  const itemTypes = ['skill', 'artifact', 'set_piece'] as const;
  const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
  let itemName = '';
  
  switch (itemType) {
    case 'skill':
      const classSkills = skillsByClass[characterClass as keyof typeof skillsByClass] || skillsByClass.warrior;
      itemName = classSkills[Math.floor(Math.random() * classSkills.length)];
      break;
    case 'artifact':
      itemName = artifacts[Math.floor(Math.random() * artifacts.length)];
      break;
    case 'set_piece':
      itemName = sets[Math.floor(Math.random() * sets.length)];
      break;
  }

  const rarity = getRandomRarity();
  
  // Better drops for higher rank dungeons
  const rankModifier = { 'E': 0, 'D': 0.1, 'C': 0.2, 'B': 0.3, 'A': 0.5, 'S': 0.8 }[dungeonRank] || 0;
  const baseStats = Math.floor(Math.random() * 10) + 1;
  const bonusStats = Math.floor(baseStats * rankModifier);

  return {
    item_type: itemType as any,
    item_name: itemName,
    rarity: rarity as any,
    description: `A ${rarity} ${itemType.replace('_', ' ')} obtained from dungeon exploration`,
    stats: {
      power: baseStats + bonusStats,
      bonus: rankModifier > 0 ? `+${Math.floor(rankModifier * 100)}% from ${dungeonRank} rank dungeon` : null
    }
  };
};

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [pendingAttempts, setPendingAttempts] = useState<PendingAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingAttempts();
  }, []);

  const fetchPendingAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('dungeon_attempts')
        .select(`
          *,
          teams(team_name, character_class, level),
          dungeons(name, rank)
        `)
        .eq('status', 'pending')
        .order('attempted_at');

      if (error) throw error;
      setPendingAttempts(data || []);
    } catch (error) {
      console.error('Error fetching pending attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (attemptId: string, approved: boolean, notes?: string) => {
    setProcessingId(attemptId);
    
    try {
      // Get the attempt details for drop generation
      const attempt = pendingAttempts.find(a => a.id === attemptId);
      if (!attempt) throw new Error('Attempt not found');

      // Update the attempt status
      const { error: updateError } = await supabase
        .from('dungeon_attempts')
        .update({
          status: approved ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewer_notes: notes
        })
        .eq('id', attemptId);

      if (updateError) throw updateError;

      // If approved, generate and add a random drop
      if (approved) {
        const drop = generateRandomDrop(attempt.teams.character_class, attempt.dungeons.rank);
        
        const { error: inventoryError } = await supabase
          .from('inventory')
          .insert({
            team_id: attempt.team_id,
            obtained_from: attemptId,
            ...drop
          });

        if (inventoryError) throw inventoryError;
      }

      toast({
        title: approved ? "Attempt approved!" : "Attempt rejected",
        description: approved ? "Random drop has been added to team inventory" : "The team has been notified"
      });

      // Refresh the list
      fetchPendingAttempts();
    } catch (error) {
      toast({
        title: "Error processing attempt",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Crown className="h-8 w-8" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Manage dungeon attempts and approve rewards</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                <p className="text-2xl font-bold">{pendingAttempts.length}</p>
                <p className="text-sm text-muted-foreground">Pending Attempts</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">∞</p>
                <p className="text-sm text-muted-foreground">Total Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                <p className="text-2xl font-bold">∞</p>
                <p className="text-sm text-muted-foreground">Total Rejected</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Attempts */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Dungeon Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingAttempts.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No pending attempts to review</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingAttempts.map((attempt) => (
                  <div key={attempt.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold text-lg">{attempt.teams.team_name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            Level {attempt.teams.level} {attempt.teams.character_class}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">{attempt.dungeons.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Rank {attempt.dungeons.rank}</Badge>
                            <span className="text-sm text-muted-foreground">
                              Attempted: {new Date(attempt.attempted_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApproval(attempt.id, true)}
                        disabled={processingId === attempt.id}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {processingId === attempt.id ? 'Processing...' : 'Approve & Generate Drop'}
                      </Button>
                      <Button
                        onClick={() => handleApproval(attempt.id, false)}
                        disabled={processingId === attempt.id}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
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