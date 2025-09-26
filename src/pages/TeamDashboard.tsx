import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth, Team } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LogOut, Sword, Shield, Zap, Heart, Star, Package, Users, BookOpen, X, PlusCircle } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { Link } from 'react-router-dom';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';

interface Dungeon {
  id: string;
  name: string;
  rank: string;
  description: string;
  min_level: number;
}

type InventoryItem = Database['public']['Tables']['inventory']['Row'];
type PlayerWithEquipment = Database['public']['Tables']['players']['Row'] & {
  equipped_skill_item?: InventoryItem;
  equipped_artifact_items?: InventoryItem[];
};

interface DungeonAttempt {
  id: string;
  dungeon_id: string;
  status: string;
  attempted_at: string;
  dungeons: { name: string, rank: string };
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

const staminaCosts: Record<string, number> = {
  E: 0,   // 0 * 5
  D: 5,   // 1 * 5
  C: 10,  // 2 * 5
  B: 15,  // 3 * 5
  A: 20,  // 4 * 5
  S: 25,  // 5 * 5
};

const artifactSets = {
  "Lion's Set": { "2-set": "Gains ATK +50", "4-set": "Ignores 20% of enemy defense" },
  "Angel in White Set": { "2-set": "Gains HP +250", "4-set": "Reduces own ATK by 10%, increases allies' ATK by 15%" },
  "Golden Gladiator Set": { "2-set": "Gains DEF +30", "4-set": "Reduces own HP by 200, increases allies' DEF by 20" },
  "Destroyer Set": { "2-set": "Power gauge rate increases by 10%", "4-set": "Starts battle with 30% power gauge" },
  "Red Panther Set": { "2-set": "Gains ATK +15 and DEF +15", "4-set": "Reduces own HP by 200, gains an additional ATK +15 and DEF +15" }
};

const skillData: Record<string, { target?: string }> = {
  "Fireball (Common)": { target: "Area" },
  "Fireball (Uncommon)": { target: "Area" },
  "Fireball (Rare)": { target: "Single" },
  "Fireball (Epic)": { target: "Single" },
  "Fireball (Legendary)": { target: "Area" },
  "Heal (Rare)": { target: "Single Ally" },
  "Mass Heal (Epic)": { target: "All Allies" },
  "Protect (Uncommon)": { target: "Single Ally" },
};

const calculateModifiedStats = (player: PlayerWithEquipment, activeBonuses: { bonus: string }[]) => {
  const modifications: { health: number; attack: number; defense: number; mana: number } = { health: 0, attack: 0, defense: 0, mana: 0 };

  for (const { bonus } of activeBonuses) {
    const selfEffects = bonus.split(',').filter(s => !s.includes('allies'));

    for (const effect of selfEffects) {
      // Regex for: (Action) (Stat) (Operator) (Value)(%)
      // e.g., "Gains ATK +50", "Reduces own HP by 200", "Reduces own ATK by 10%"
      const matches = effect.matchAll(/(Gains|Increases|Reduces)\s*(?:own\s)?(HP|ATK|DEF)\s*(?:by\s|\+)?(-?\d+)(%?)/gi);

      for (const match of matches) {
        const action = match[1].toLowerCase();
        const stat = match[2].toLowerCase();
        let value = parseInt(match[3], 10);
        const isPercent = match[4] === '%';

        if (action === 'reduces') {
          value = -Math.abs(value);
        }

        let modificationAmount = 0;
        if (isPercent) {
          let baseStat = 0;
          if (stat === 'hp') baseStat = player.health;
          if (stat === 'atk') baseStat = player.attack;
          if (stat === 'def') baseStat = player.defense;
          modificationAmount = Math.ceil(baseStat * (value / 100));
        } else {
          modificationAmount = value;
        }

        if (stat === 'hp') modifications.health += modificationAmount;
        if (stat === 'atk') modifications.attack += modificationAmount;
        if (stat === 'def') modifications.defense += modificationAmount;
      }
    }
  }

  return {
    health: player.health + modifications.health,
    attack: player.attack + modifications.attack,
    defense: player.defense + modifications.defense,
    mana: player.mana + modifications.mana, // Mana is not affected yet, but included for structure
    modifications,
  };
};

const calculateAllyBuffs = (player: PlayerWithEquipment, activeBonuses: { bonus: string }[]) => {
  const modifications: { health: number; attack: number; defense: number } = { health: 0, attack: 0, defense: 0 };

  for (const { bonus } of activeBonuses) {
    const allyEffects = bonus.split(',').filter(s => s.includes('allies'));

    for (const effect of allyEffects) {
      // Regex for: (Action) allies' (Stat) by/+ (Value)(%)
      // e.g., "increases allies' ATK by 10%", "increases allies' DEF by 20"
      const matches = effect.matchAll(/(increases)\s*allies'\s*(HP|ATK|DEF)\s*(?:by\s|\+)?(\d+)(%?)/gi);

      for (const match of matches) {
        const stat = match[2].toLowerCase();
        const value = parseInt(match[3], 10);
        const isPercent = match[4] === '%';

        // We'll store the value and type, and apply it to each ally later
        // For now, we just parse it. The logic here is simplified because we can't know the ally's base stat yet.
        // We will pass the raw bonus string and parse it for each ally.
        // This is a placeholder for a more complex implementation.
        // Let's adjust the main loop to handle this.
      }
    }
  }
  // This function is a bit tricky. Let's refactor the main component loop instead.
  return modifications;
};

const getActiveSetBonuses = (player: PlayerWithEquipment, inventory: InventoryItem[]) => {
  if (!player.equipped_artifacts || player.equipped_artifacts.length === 0) return [];

  const setCounts: Record<string, number> = {};
  for (const artifactId of player.equipped_artifacts) {
    const item = inventory.find(invItem => invItem.id === artifactId);
    if (item && (item.item_type === 'artifact' || item.item_type === 'set_piece')) {
      setCounts[item.item_name] = (setCounts[item.item_name] || 0) + 1;
    }
  }

  const bonuses: { setName: string, bonus: string, count: 2 | 4 }[] = [];
  for (const [setName, count] of Object.entries(setCounts)) {
    const setInfo = artifactSets[setName as keyof typeof artifactSets];
    if (!setInfo) continue;

    if (count >= 4) {
      bonuses.push({ setName, bonus: setInfo['4-set'], count: 4 });
    }
    if (count >= 2) {
      bonuses.push({ setName, bonus: setInfo['2-set'], count: 2 });
    }
  }

  return bonuses;
};

export default function TeamDashboard() {
  const { team, signOut, loading: authLoading, setTeam } = useAuth();
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [attempts, setAttempts] = useState<DungeonAttempt[]>([]);
  const [mergeRequests, setMergeRequests] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithEquipment | null>(null);
  const [isEquipDrawerOpen, setIsEquipDrawerOpen] = useState(false);

  useEffect(() => {
    if (team) {
      fetchData(team);
    }
  }, [team]);

  const fetchData = async (currentTeam: typeof team) => {
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
        .eq('team_id', currentTeam.id)
        .order('obtained_at', { ascending: false });

      // Fetch attempts
      const { data: attemptsData } = await supabase
        .from('dungeon_attempts')
        .select('*, dungeons(name, rank)')
        .eq('team_id', currentTeam.id)
        .order('attempted_at', { ascending: false });

      // Fetch merge requests
      const { data: mergeData } = await supabase
        .from('merge_requests')
        .select('*')
        .eq('team_id', currentTeam.id)
        .order('requested_at', { ascending: false });

      setDungeons(dungeonsData || []);
      setInventory(inventoryData || []);
      setAttempts(attemptsData || []);
      setMergeRequests(mergeData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const attemptDungeon = async (dungeonId: string, rank: string) => {
    try {
      const dungeon = dungeons.find(d => d.id === dungeonId);
      if (!dungeon) throw new Error("Dungeon not found");

      const cost = staminaCosts[dungeon.rank];
      if (team && team.stamina < cost) {
        toast({ title: "Not enough stamina!", description: `You need ${cost} stamina to attempt this dungeon.`, variant: "destructive" });
        return;
      }

      // Deduct stamina
      const newStamina = team!.stamina - cost;
      const { data: updatedTeam, error: staminaError } = await supabase
        .from('teams')
        .update({ stamina: newStamina })
        .eq('id', team!.id)
        .select('*, players(*)')
        .single();

      if (staminaError) throw staminaError;

      // Update local team state for immediate UI feedback
      // By fetching the team data, we ensure all info is up-to-date from the DB
      const newTeamState = { ...updatedTeam, players: updatedTeam.players || [] };
      if (updatedTeam) setTeam(newTeamState);

      const { error: attemptError } = await supabase
        .from('dungeon_attempts')
        .insert({
          team_id: team?.id,
          dungeon_id: dungeonId,
          status: 'pending'
        });

      if (attemptError) throw attemptError;

      toast({
        title: "Dungeon attempt submitted!",
        description: "Your request is pending admin approval"
      });

      // Re-fetch all dashboard data with the new team state
      if (updatedTeam) await fetchData(newTeamState);
    } catch (error) {
      toast({
        title: "Failed to attempt dungeon",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const refreshTeamData = async () => {
    if (!team) return;
    try {
      const { data: freshTeam, error } = await supabase
        .from('teams')
        .select('*, players(*)')
        .eq('id', team.id)
        .single();
      if (error) throw error;
      if (freshTeam) {
        setTeam({ ...freshTeam, players: freshTeam.players || [] });
        await fetchData({ ...freshTeam, players: freshTeam.players || [] });
      }
    } catch (error) {
      console.error("Failed to refresh team data", error);
      toast({ title: "Could not refresh team data", variant: "destructive" });
    }
  };

  const handleEquipItem = async (player: PlayerWithEquipment, item: InventoryItem) => {
    try {
      // Final check to ensure the item isn't already equipped by another player
      const { data: allPlayers, error: playersError } = await supabase
        .from('players')
        .select('equipped_skill, equipped_artifacts')
        .eq('team_id', team!.id);

      if (playersError) throw playersError;

      const isAlreadyEquipped = allPlayers.some(p => p.equipped_skill === item.id || p.equipped_artifacts?.includes(item.id));
      if (isAlreadyEquipped) {
        toast({ title: "Item Already Equipped", description: "This item is already in use by another team member.", variant: "destructive" });
        await refreshTeamData(); // Refresh to show the correct state
        return;
      }
      let updateData: Partial<PlayerWithEquipment> = {};
      if (item.item_type === 'skill') {
        if (player.equipped_skill) {
          toast({ title: "Skill slot is full", description: "Unequip the current skill first.", variant: "destructive" });
          return;
        }
        updateData.equipped_skill = item.id;
      } else if (item.item_type === 'artifact' || item.item_type === 'set_piece') {
        const artifacts = player.equipped_artifacts || [];
        if (artifacts.length >= 4) {
          toast({ title: "Artifact limit reached", description: "You can only equip 4 artifacts per player.", variant: "destructive" });
          return;
        }
        updateData.equipped_artifacts = [...artifacts, item.id];
      }

      const { error } = await supabase.from('players').update(updateData).eq('id', player.id);
      if (error) throw error;

      toast({ title: "Item equipped!", description: `${item.item_name} has been equipped to ${player.name}.` });
      await refreshTeamData();
    } catch (error) {
      toast({ title: "Failed to equip item", variant: "destructive" });
    }
  };

  const handleUnequipItem = async (player: PlayerWithEquipment, item: InventoryItem) => {
    try {
      let updateData: Partial<PlayerWithEquipment> = {};
      if (item.item_type === 'skill') {
        updateData.equipped_skill = null;
      } else if (item.item_type === 'artifact' || item.item_type === 'set_piece') {
        const artifacts = player.equipped_artifacts || [];
        updateData.equipped_artifacts = artifacts.filter(id => id !== item.id);
      }

      const { error } = await supabase.from('players').update(updateData).eq('id', player.id);
      if (error) throw error;

      toast({ title: "Item unequipped!", description: `${item.item_name} has been unequipped from ${player.name}.` });
      await refreshTeamData();
    } catch (error) {
      toast({ title: "Failed to unequip item", variant: "destructive" });
    }
  };
  const requestMerge = async (skill1Id: string, skill2Id: string) => {
    try {
      const { error } = await supabase
        .from('merge_requests')
        .insert({
          team_id: team!.id,
          skill1_id: skill1Id,
          skill2_id: skill2Id
        });

      if (error) throw error;

      toast({
        title: "Merge request submitted!",
        description: "Your merge request is pending admin approval"
      });

      fetchData(team!);
    } catch (error) {
      toast({
        title: "Failed to submit merge request",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const getMergeableSkills = () => {
    const skills = inventory.filter(item => item.item_type === 'skill');
    const skillGroups: Record<string, InventoryItem[]> = {};
    
    skills.forEach(skill => {
      const key = `${skill.item_name}-${skill.rarity}`;
      if (!skillGroups[key]) skillGroups[key] = [];
      skillGroups[key].push(skill);
    });

    return Object.entries(skillGroups).filter(([_, skills]) => skills.length >= 2);
  };

  const getNextRarity = (currentRarity: string) => {
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const currentIndex = rarityOrder.indexOf(currentRarity);
    return currentIndex < rarityOrder.length - 1 ? rarityOrder[currentIndex + 1] : 'legendary';
  };

  useEffect(() => {
    if (isEquipDrawerOpen && selectedPlayer) {
      const freshPlayer = team?.players.find(p => p.id === selectedPlayer.id);
      if (freshPlayer) openEquipDrawer(freshPlayer);
    }
  }, [team, isEquipDrawerOpen]);

  const openEquipDrawer = (player: PlayerWithEquipment) => {
    const equippedSkillItem = inventory.find(item => item.id === player.equipped_skill);
    const equippedArtifactItems = (player.equipped_artifacts || []).map(id => inventory.find(item => item.id === id)).filter(Boolean) as InventoryItem[];
    setSelectedPlayer({ ...player, equipped_skill_item: equippedSkillItem, equipped_artifact_items: equippedArtifactItems });
    setIsEquipDrawerOpen(true);
  };

  const allEquippedItemIds = team?.players.reduce((acc, player) => {
    if (player.equipped_skill) acc.add(player.equipped_skill);
    (player.equipped_artifacts || []).forEach(id => acc.add(id));
    return acc;
  }, new Set<string>()) || new Set();
  const availableInventory = inventory.filter(item => !allEquippedItemIds.has(item.id));

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
              {team.players.map(player => {
                // 1. Calculate self-modifications from own sets
                const ownActiveBonuses = getActiveSetBonuses(player, inventory);
                const { modifications: selfModifications } = calculateModifiedStats(player, ownActiveBonuses);

                // 2. Calculate modifications from allies' buffs
                const allyModifications = { health: 0, attack: 0, defense: 0 };
                team.players.forEach(otherPlayer => {
                  if (otherPlayer.id === player.id) return; // Don't get buffs from self

                  const otherPlayerBonuses = getActiveSetBonuses(otherPlayer, inventory);
                  for (const { bonus } of otherPlayerBonuses) {
                    const allyEffects = bonus.split(',').filter(s => s.includes('allies'));
                    for (const effect of allyEffects) {
                      const matches = effect.matchAll(/(increases)\s*allies'\s*(HP|ATK|DEF)\s*(?:by\s|\+)?(\d+)(%?)/gi);
                      for (const match of matches) {
                        const stat = match[2].toLowerCase();
                        const value = parseInt(match[3], 10);
                        const isPercent = match[4] === '%';

                        let modificationAmount = 0;
                        if (isPercent) {
                          let baseStat = 0;
                          if (stat === 'hp') baseStat = player.health; // The 'player' is the ally receiving the buff
                          if (stat === 'atk') baseStat = player.attack; // The 'player' is the ally receiving the buff
                          if (stat === 'def') baseStat = player.defense; // The 'player' is the ally receiving the buff
                          modificationAmount = Math.ceil(baseStat * (value / 100));
                        } else {
                          modificationAmount = value;
                        }

                        if (stat === 'hp') allyModifications.health += modificationAmount;
                        if (stat === 'atk') allyModifications.attack += modificationAmount;
                        if (stat === 'def') allyModifications.defense += modificationAmount;
                      }
                    }
                  }
                });

                // 3. Combine all modifications
                const totalModifications = {
                  health: selfModifications.health + allyModifications.health,
                  attack: selfModifications.attack + allyModifications.attack,
                  defense: selfModifications.defense + allyModifications.defense,
                };

                const finalStats = {
                  health: player.health + totalModifications.health,
                  attack: player.attack + totalModifications.attack,
                  defense: player.defense + totalModifications.defense,
                };

                return (
                <Card key={player.id} className="p-4 flex flex-col">
                  <CardHeader className="p-0 mb-2">
                    <CardTitle className="text-lg">{player.name}</CardTitle>
                    <p className="text-sm text-muted-foreground capitalize">{player.character_class}</p>
                  </CardHeader>
                  <CardContent className="p-0 text-sm space-y-1 flex-grow">
                    <p><Heart className="inline h-4 w-4 mr-1 text-red-500" /> HP: {finalStats.health} {totalModifications.health !== 0 && <span className={totalModifications.health > 0 ? "text-green-400" : "text-red-400"}>({totalModifications.health > 0 ? '+' : ''}{totalModifications.health})</span>}</p>
                    <p><Zap className="inline h-4 w-4 mr-1 text-blue-500" /> MP: {player.mana}</p>
                    <p><Sword className="inline h-4 w-4 mr-1 text-gray-600" /> ATK: {finalStats.attack} {totalModifications.attack !== 0 && <span className={totalModifications.attack > 0 ? "text-green-400" : "text-red-400"}>({totalModifications.attack > 0 ? '+' : ''}{totalModifications.attack})</span>}</p>
                    <p><Shield className="inline h-4 w-4 mr-1 text-gray-400" /> DEF: {finalStats.defense} {totalModifications.defense !== 0 && <span className={totalModifications.defense > 0 ? "text-green-400" : "text-red-400"}>({totalModifications.defense > 0 ? '+' : ''}{totalModifications.defense})</span>}</p>
                  </CardContent>
                  <div className="mt-4">
                    <Button variant="secondary" className="w-full" onClick={() => openEquipDrawer(player)}>
                      Equip
                    </Button>
                  </div>
                  {ownActiveBonuses.length > 0 && (
                    <div className="mt-4 pt-2 border-t">
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Active Set Bonuses</h4>
                      <div className="space-y-1">
                        {ownActiveBonuses.map(b => (
                          <p key={b.bonus} className="text-xs text-green-400">
                            <span className="font-bold">({b.count}) {b.setName}:</span> {b.bonus}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )})}
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
              {dungeons.map((dungeon, index, arr) => {
                const completedRanks = new Set(
                  attempts
                    .filter(a => a.status === 'approved')
                    .map(a => a.dungeons.rank)
                );

                const rankOrder = ['E', 'D', 'C', 'B', 'A', 'S'];
                const currentRankIndex = rankOrder.indexOf(dungeon.rank);
                const prevRank = currentRankIndex > 0 ? rankOrder[currentRankIndex - 1] : null;

                const isUnlocked = ['E', 'D'].includes(dungeon.rank) || (prevRank && completedRanks.has(prevRank));
                
                const staminaCost = staminaCosts[dungeon.rank];
                const hasEnoughStamina = team.stamina >= staminaCost;

                const hasPendingAttempt = attempts.some(
                  attempt => attempt.dungeon_id === dungeon.id && attempt.status === 'pending'
                );
                
                const canAttempt = isUnlocked && hasEnoughStamina;

                return (
                  <div key={dungeon.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{dungeon.name}</h3>
                        <p className="text-sm text-muted-foreground">{dungeon.description}</p>
                        <p className="text-sm">Stamina Cost: <span className="font-bold">{staminaCost}</span></p>
                      </div>
                      <Badge className={getRankColor(dungeon.rank)}>
                        Rank {dungeon.rank}
                      </Badge>
                    </div>
                    <Button
                      onClick={() => attemptDungeon(dungeon.id, dungeon.rank)}
                      disabled={!canAttempt || hasPendingAttempt}
                      className="w-full"
                      variant={canAttempt ? "default" : "secondary"}
                    > 
                      {hasPendingAttempt ? 'Pending Approval' :
                       !isUnlocked ? `🔒 Locked` :
                       !hasEnoughStamina ? `Not enough stamina` :
                       'Attempt Dungeon'}
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
                      <div className="flex-1 space-y-1">
                        <h4 className={`font-semibold ${item.item_type === 'skill' ? getRarityColor(item.rarity) : 'text-primary'}`}>
                          {item.item_name}
                        </h4>
                        <p className="text-sm text-muted-foreground capitalize">
                          {item.item_type === 'skill'
                            ? `${item.rarity} ${item.item_type.replace('_', ' ')}`
                            : item.item_type.replace('_', ' ')}
                        </p>
                        {item.item_type === 'skill' && skillData[`${item.item_name} (${item.rarity})`]?.target && (
                          <p className="text-xs text-muted-foreground">
                            Target: <span className="font-medium text-foreground">{skillData[`${item.item_name} (${item.rarity})`]?.target}</span>
                          </p>
                        )}
                        {item.stats && typeof item.stats === 'object' && (
                          <div className="text-xs mt-2 space-y-1 bg-muted/50 p-2 rounded-md">
                            {Object.entries(item.stats).map(([key, value]) => (
                              value && (
                                <p key={key}>
                                  <span className="font-semibold capitalize">{key.replace(/_/g, ' ')}:</span> {String(value)}
                                </p>
                              )
                            ))}
                          </div>
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

        {/* Skill Merge Requests */}
        {getMergeableSkills().length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Skill Merging
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {getMergeableSkills().map(([skillKey, skills]) => {
                const [skillName, rarity] = skillKey.split('-');
                const nextRarity = getNextRarity(rarity);
                const hasPendingRequest = mergeRequests.some(
                  req => req.status === 'pending' && 
                  [req.skill1_id, req.skill2_id].every(id => skills.some(s => s.id === id))
                );
                
                return (
                  <div key={skillKey} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{skillName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Merge 2 <span className={getRarityColor(rarity)}>{rarity}</span> → 1 <span className={getRarityColor(nextRarity)}>{nextRarity}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Available: {skills.length} skills
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => requestMerge(skills[0].id, skills[1].id)}
                      disabled={hasPendingRequest || skills.length < 2}
                      className="w-full"
                      variant={hasPendingRequest ? "secondary" : "default"}
                    >
                      {hasPendingRequest ? 'Merge Request Pending' : 'Request Merge'}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Merge Request Status */}
        {mergeRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Merge Request History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mergeRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex justify-between items-center border rounded-lg p-3">
                    <div>
                      <p className="font-medium">Skill Merge Request</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(request.requested_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={
                      request.status === 'approved' ? 'default' :
                      request.status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {request.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                      <p className="font-medium">{attempt.dungeons?.name || 'Unknown Dungeon'}</p>
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

        {/* Equipment Drawer */}
        <Drawer open={isEquipDrawerOpen} onOpenChange={setIsEquipDrawerOpen}>
          <DrawerContent>
            {selectedPlayer && (
              <div className="mx-auto w-full max-w-2xl">
                <DrawerHeader>
                  <DrawerTitle>Equip {selectedPlayer.name}</DrawerTitle>
                  <DrawerDescription>Equip 1 skill and up to 4 artifacts.</DrawerDescription>
                </DrawerHeader>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Equipped Items */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-center">Equipped</h4>
                    {/* Skill Slot */}
                    <Card>
                      <CardHeader className="p-2">
                        <CardTitle className="text-sm font-medium">Skill</CardTitle>
                      </CardHeader>
                      <CardContent className="p-2">
                        {selectedPlayer.equipped_skill_item ? (
                          <div className="flex items-center justify-between text-sm">
                            <span className={getRarityColor(selectedPlayer.equipped_skill_item.rarity)}>{selectedPlayer.equipped_skill_item.item_name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUnequipItem(selectedPlayer, selectedPlayer.equipped_skill_item!)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : <p className="text-sm text-muted-foreground">Empty</p>}
                      </CardContent>
                    </Card>
                    {/* Artifact Slots */}
                    <Card>
                      <CardHeader className="p-2">
                        <CardTitle className="text-sm font-medium">Artifacts ({selectedPlayer.equipped_artifact_items?.length || 0}/4)</CardTitle>
                      </CardHeader>
                      <CardContent className="p-2 space-y-2">
                        {[...Array(4)].map((_, i) => {
                          const item = selectedPlayer.equipped_artifact_items?.[i];
                          return (
                            <div key={i} className="flex items-center justify-between text-sm border-b pb-1">
                              {item ? (
                                <>
                                  <span>{item.item_name}</span>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUnequipItem(selectedPlayer, item)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : <p className="text-sm text-muted-foreground">Empty Slot</p>}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </div>
                  {/* Available Inventory */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-center">Available Inventory</h4>
                    <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                      {availableInventory.length > 0 ? availableInventory.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                          <div>
                            <p className={`font-medium ${getRarityColor(item.rarity)}`}>{item.item_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{item.item_type.replace('_', ' ')} - {item.rarity}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleEquipItem(selectedPlayer, item)}>
                            <PlusCircle className="h-4 w-4 mr-2" /> Equip
                          </Button>
                        </div>
                      )) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No available items to equip.</p>
                      )}
                    </div>
                  </div>
                </div>
                <DrawerFooter>
                  <Button variant="outline" onClick={() => setIsEquipDrawerOpen(false)}>
                    Done
                  </Button>
                </DrawerFooter>
              </div>
            )}
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}