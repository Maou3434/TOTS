import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LogOut, CheckCircle, XCircle, Clock, Crown, BookOpen } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { Link } from 'react-router-dom';

type Player = Database['public']['Tables']['players']['Row'];

interface PendingAttempt {
  id: string;
  team_id: string;
  dungeon_id: string;
  status: Database['public']['Enums']['attempt_status'];
  attempted_at: string;
  teams: {
    team_name: string;
    players: Player[];
  };
  dungeons: {
    name: string;
    rank: string;
  };
}

// Game data for drop generation
const skills = {
  'Shield': { rare: 'Increases DEF by 20', epic: 'Increases DEF by 30', legendary: 'Increases DEF by 50' },
  'Berserk': { rare: 'Increases ATK by 20, reduces DEF by 10', epic: 'Increases ATK by 35, reduces DEF by 15', legendary: 'Increases ATK by 60, reduces DEF by 20' },
  'Seppuku': { rare: 'Sacrifice 200 HP for a 40 ATK boost', epic: 'Sacrifice 300 HP for a 70 ATK boost', legendary: 'Sacrifice 400 HP for a 90 ATK boost' },
  'Fireball': { rare: 'Deals 150 fixed damage to all enemies', epic: 'Deals 200 fixed damage to all enemies', legendary: 'Deals 200 fixed damage to all enemies' },
  'Lightning': { rare: 'Deals 150 fixed damage (+50 to melee)', epic: 'Deals 200 fixed damage (+50 to melee)', legendary: 'Deals 250 fixed damage (+50 to melee)' },
  'Counter Rune': { rare: '25% chance to stop the next attack', epic: '35% chance to stop the next attack', legendary: '50% chance to stop the next attack' },
  'Riposte': { rare: 'Cuts next attack by 50% and counters with 100 ATK', epic: 'Cuts next attack by 60% and counters with 125 ATK', legendary: 'Cuts next attack by 70% and counters with 150 ATK' },
  'Life Steal': { rare: 'Gain 50% of damage dealt as HP', epic: 'Gain 75% of damage dealt as HP', legendary: 'Gain 100% of damage dealt as HP' },
  'Freeze': { rare: 'Freezes an enemy in ice with 100 HP', epic: 'Freezes an enemy in ice with 200 HP', legendary: 'Freezes an enemy in ice with 300 HP' },
  'Confusion': { rare: '50% chance to make the target attack its own team', epic: '75% chance to make the target attack its own team', legendary: '90% chance to make the target attack its own team and become controllable' },
  'Dodge': { rare: '50% chance for attacks to miss for 2 turns', epic: '75% chance for attacks to miss for 2 turns', legendary: '100% chance for attacks to miss for 2 turns' },
  'Last Resort': { rare: 'Next attack deals extra damage based on 30% of missing HP', epic: 'Next attack deals extra damage based on 50% of missing HP', legendary: 'Next attack deals extra damage based on 80% of missing HP' },
};

const artifactSets = {
  "Lion's Set": {
    "2-set": "Gains ATK +50",
    "4-set": "Ignores 20% of enemy defense"
  },
  "Angel in White Set": {
    "2-set": "Gains HP +250",
    "4-set": "Reduces own ATK by 10%, increases allies' ATK by 15%"
  },
  "Golden Gladiator Set": {
    "2-set": "Gains DEF +30",
    "4-set": "Reduces own HP by 200, increases allies' DEF by 20"
  },
  "Destroyer Set": {
    "2-set": "Power gauge rate increases by 10%",
    "4-set": "Starts battle with 30% power gauge"
  },
  "Red Panther Set": {
    "2-set": "Gains ATK +15 and DEF +15",
    "4-set": "Reduces own HP by 200, gains an additional ATK +15 and DEF +15"
  }
};

const rarityByRank: Record<string, { name: string; weight: number }[]> = {
  'S': [
    { name: 'legendary', weight: 100 }
  ],
  'A': [
    { name: 'epic', weight: 60 },
    { name: 'legendary', weight: 40 }
  ],
  'B': [
    { name: 'rare', weight: 30 },
    { name: 'epic', weight: 60 },
    { name: 'legendary', weight: 10 }
  ],
  'C': [
    { name: 'rare', weight: 60 },
    { name: 'epic', weight: 37 },
    { name: 'legendary', weight: 3 }
  ],
  'D': [
    { name: 'rare', weight: 80 },
    { name: 'epic', weight: 19 },
    { name: 'legendary', weight: 1 }
  ],
  'E': [
    { name: 'rare', weight: 90 },
    { name: 'epic', weight: 10 }
  ],
};

const getRandomRarity = (dungeonRank: string) => {
  const rarities = rarityByRank[dungeonRank] || rarityByRank['E']; // Default to E rank if not found
  const totalWeight = rarities.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const rarity of rarities) {
    random -= rarity.weight;
    if (random <= 0) return rarity.name;
  }
  return rarities[0]?.name || 'common'; // Fallback
};

const generateRandomDrop = (players: Player[], dungeonRank: string, itemType: 'skill' | 'artifact' | 'set_piece') => {
  let itemName = '';
  
  switch (itemType) {
    case 'skill':
      const skillNames = Object.keys(skills);
      itemName = skillNames[Math.floor(Math.random() * skillNames.length)];
      break;
    case 'artifact':
    case 'set_piece':
      const setNames = Object.keys(artifactSets);
      itemName = setNames[Math.floor(Math.random() * setNames.length)];
      break;
  }

  const rarity = itemType === 'skill' ? getRandomRarity(dungeonRank) : 'common'; // Artifacts don't have rarity
  const description = `An item obtained from dungeon exploration.`;

  // Better drops for higher rank dungeons
  const rankModifier = { 'E': 0, 'D': 0.1, 'C': 0.2, 'B': 0.3, 'A': 0.5, 'S': 0.8 }[dungeonRank] || 0;
  const baseStats = Math.floor(Math.random() * 10) + 1;
  const bonusStats = Math.floor(baseStats * rankModifier);

  let itemStats: any = {};

  if (itemType === 'skill') {
    const skillData = skills[itemName as keyof typeof skills];
    itemStats.effect = skillData[rarity as keyof typeof skillData];
  } else if (itemType === 'artifact' || itemType === 'set_piece') {
    const setBonuses = artifactSets[itemName as keyof typeof artifactSets];
    itemStats = {
      '2-set bonus': setBonuses['2-set'],
      '4-set bonus': setBonuses['4-set'],
      description: `An item from the ${itemName}.`
    };
  }

  return {
    item_type: itemType as any,
    item_name: itemName,
    rarity: rarity as any,
    description: description,
    stats: itemStats
  };
};

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [pendingAttempts, setPendingAttempts] = useState<PendingAttempt[]>([]);
  const [mergeRequests, setMergeRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingAttempts();
    fetchMergeRequests();
  }, []);

  const fetchPendingAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('dungeon_attempts')
        .select(`
          *,
          teams(team_name, players(*)),
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

  const fetchMergeRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('merge_requests')
        .select(`
          *,
          teams(team_name)
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setMergeRequests(data || []);
    } catch (error) {
      console.error('Error fetching merge requests:', error);
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
        const drops = [
          generateRandomDrop(attempt.teams.players, attempt.dungeons.rank, 'skill'),
          generateRandomDrop(attempt.teams.players, attempt.dungeons.rank, 'artifact'),
          generateRandomDrop(attempt.teams.players, attempt.dungeons.rank, 'artifact'),
        ];

        const inventoryItems = drops.map(drop => ({
          team_id: attempt.team_id,
          obtained_from: attemptId,
          ...drop
        }));
        
        const { error: inventoryError } = await supabase
          .from('inventory')
          .insert(inventoryItems);

        if (inventoryError) throw inventoryError;
      }

      toast({
        title: approved ? "Attempt approved!" : "Attempt rejected",
        description: approved ? "1 skill and 2 artifacts have been added to the team's inventory." : "The team has been notified"
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

  const handleMergeApproval = async (mergeId: string, approved: boolean, notes?: string) => {
    setProcessingId(mergeId);
    
    try {
      const mergeRequest = mergeRequests.find(m => m.id === mergeId);
      if (!mergeRequest) throw new Error('Merge request not found');

      // Update the merge request status
      const { error: updateError } = await supabase
        .from('merge_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewer_notes: notes
        })
        .eq('id', mergeId);

      if (updateError) throw updateError;

      if (approved) {
        // Get the two skills being merged
        const { data: skills, error: skillsError } = await supabase
          .from('inventory')
          .select('*')
          .in('id', [mergeRequest.skill1_id, mergeRequest.skill2_id]);

        if (skillsError) throw skillsError;
        if (!skills || skills.length !== 2) throw new Error('Skills not found');

        const skill = skills[0];
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
        const currentIndex = rarityOrder.indexOf(skill.rarity as any);
        const newRarity = currentIndex < rarityOrder.length - 1 ? rarityOrder[currentIndex + 1] : 'legendary' as const;

        // Remove the two old skills
        const { data: deletedData, error: deleteError } = await supabase
          .from('inventory')
          .delete()
          .in('id', [mergeRequest.skill1_id, mergeRequest.skill2_id])
          .select(); // Add this to return the deleted rows

        if (deleteError) throw deleteError;

        if (!deletedData || deletedData.length !== 2) {
          throw new Error('Failed to delete the old skills. Please check RLS policies.');
        }

        console.log('Successfully deleted old skills:', deletedData);

        // Add the new merged skill
        const { error: insertError } = await supabase
          .from('inventory')
          .insert({
            team_id: mergeRequest.team_id,
            item_name: skill.item_name,
            item_type: 'skill',
            rarity: newRarity,
            description: `Merged ${newRarity} ${skill.item_name}`,
            stats: skill.stats,
            obtained_from: null
          });

        if (insertError) throw insertError;
      }

      toast({
        title: approved ? "Merge approved!" : "Merge rejected",
        description: approved ? "The skills have been merged successfully." : "The merge request has been rejected"
      });

      // Refresh the list
      fetchMergeRequests();
    } catch (error) {
      console.error("Error processing merge:", error);
      toast({
        title: "Error processing merge",
        description: (error as Error).message || "Please try again",
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
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/game-data">
                <BookOpen className="h-4 w-4 mr-2" />
                Game Guide
              </Link>
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
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
                          <p className="text-sm text-muted-foreground">
                            Players: {attempt.teams.players.map(p => `${p.name} (${p.character_class})`).join(', ')}
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

        {/* Pending Merge Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Skill Merge Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {mergeRequests.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No pending merge requests to review</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mergeRequests.map((mergeRequest) => (
                  <div key={mergeRequest.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold text-lg">{mergeRequest.teams?.team_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Skill Merge Request
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Requested: {new Date(mergeRequest.requested_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleMergeApproval(mergeRequest.id, true)}
                        disabled={processingId === mergeRequest.id}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {processingId === mergeRequest.id ? 'Processing...' : 'Approve Merge'}
                      </Button>
                      <Button
                        onClick={() => handleMergeApproval(mergeRequest.id, false)}
                        disabled={processingId === mergeRequest.id}
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