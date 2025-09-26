import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Sword, Shield, Zap } from 'lucide-react';

type Player = Database['public']['Tables']['players']['Row'];
type InventoryItem = Database['public']['Tables']['inventory']['Row'];
type TeamWithPlayers = Database['public']['Tables']['teams']['Row'] & {
  players: Player[];
};

const artifactSets: Record<string, { "2-set": string; "4-set": string }> = {
    "Lion's Set": { "2-set": "Gains ATK +50", "4-set": "Ignores 20% of enemy defense" },
    "Angel in White Set": { "2-set": "Gains HP +250", "4-set": "Reduces own ATK by 10%, increases allies' ATK by 15%" },
    "Golden Gladiator Set": { "2-set": "Gains DEF +30", "4-set": "Reduces own HP by 200, increases allies' DEF by 20" },
    "Destroyer Set": { "2-set": "Power gauge rate increases by 10%", "4-set": "Starts battle with 30% power gauge" },
    "Red Panther Set": { "2-set": "Gains ATK +15 and DEF +15", "4-set": "Reduces own HP by 200, gains an additional ATK +15 and DEF +15" }
};

const getActiveSetBonuses = (player: Player, inventory: InventoryItem[]) => {
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

        if (count >= 4) bonuses.push({ setName, bonus: setInfo['4-set'], count: 4 });
        if (count >= 2) bonuses.push({ setName, bonus: setInfo['2-set'], count: 2 });
    }
    return bonuses;
};

const calculateFinalStats = (player: Player, teamPlayers: Player[], inventory: InventoryItem[]) => {
    const selfModifications = { health: 0, attack: 0, defense: 0 };
    const ownActiveBonuses = getActiveSetBonuses(player, inventory);

    // 1. Calculate self-modifications from own sets
    for (const { bonus } of ownActiveBonuses) {
        const selfEffects = bonus.split(',').filter(s => !s.includes('allies'));
        for (const effect of selfEffects) {
            const matches = effect.matchAll(/(Gains|Increases|Reduces)\s*(?:own\s)?(HP|ATK|DEF)\s*(?:by\s|\+)?(-?\d+)(%?)/gi);
            for (const match of matches) {
                const action = match[1].toLowerCase();
                const stat = match[2].toLowerCase();
                let value = parseInt(match[3], 10);
                const isPercent = match[4] === '%';

                if (action === 'reduces') value = -Math.abs(value);

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

                if (stat === 'hp') selfModifications.health += modificationAmount;
                if (stat === 'atk') selfModifications.attack += modificationAmount;
                if (stat === 'def') selfModifications.defense += modificationAmount;
            }
        }
    }

    // 2. Calculate modifications from allies' buffs
    const allyModifications = { health: 0, attack: 0, defense: 0 };
    teamPlayers.forEach(otherPlayer => {
        if (otherPlayer.id === player.id) return;
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
                        if (stat === 'hp') baseStat = player.health;
                        if (stat === 'atk') baseStat = player.attack;
                        if (stat === 'def') baseStat = player.defense;
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

    return {
        ...player,
        health: player.health + selfModifications.health + allyModifications.health,
        attack: player.attack + selfModifications.attack + allyModifications.attack,
        defense: player.defense + selfModifications.defense + allyModifications.defense,
    };
};

const PlayerCard = ({
    player,
    isSelected,
    selectionColor,
    onClick
}: {
    player: Player;
    isSelected?: boolean;
    selectionColor?: 'blue' | 'red';
    onClick?: () => void;
}) => (
    <Card className={`p-4 transition-all cursor-pointer ${isSelected ? `ring-2 ${selectionColor === 'blue' ? 'ring-blue-500' : 'ring-red-500'}` : 'hover:bg-accent'}`} onClick={onClick}>
        <CardHeader className="p-0 mb-2">
            <CardTitle className="text-lg">{player.name}</CardTitle>
            <p className="text-sm text-muted-foreground capitalize">{player.character_class}</p>
        </CardHeader>
        <CardContent className="p-0 text-sm space-y-1">
            <p><Heart className="inline h-4 w-4 mr-1 text-red-500" /> HP: {player.health.toLocaleString()}</p>
            <p><Zap className="inline h-4 w-4 mr-1 text-blue-500" /> MP: {player.mana.toLocaleString()}</p>
            <p><Sword className="inline h-4 w-4 mr-1 text-gray-600" /> ATK: {player.attack.toLocaleString()}</p>
            <p><Shield className="inline h-4 w-4 mr-1 text-gray-400" /> DEF: {player.defense.toLocaleString()}</p>
        </CardContent>
    </Card>
);

export default function BattleCalculator() {
    const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [team1Id, setTeam1Id] = useState<string | null>(null);
    const [team2Id, setTeam2Id] = useState<string | null>(null);
    const [attackerId, setAttackerId] = useState<string | null>(null);
    const [defenderId, setDefenderId] = useState<string | null>(null);
    const [damageCalculation, setDamageCalculation] = useState<{ log: string[], finalDamage: number } | null>(null);


    useEffect(() => {
        const fetchData = async () => {
            const { data: teamsData, error: teamsError } = await supabase
                .from('teams')
                .select('*, players(*)');
            if (teamsError) console.error("Error fetching teams:", teamsError);
            else setTeams(teamsData || []);

            const { data: inventoryData, error: inventoryError } = await supabase
                .from('inventory')
                .select('*');
            if (inventoryError) console.error("Error fetching inventory:", inventoryError);
            else setInventory(inventoryData || []);
        };
        fetchData();
    }, []);

    useEffect(() => {
        // Reset selections if teams change
        setAttackerId(null);
        setDefenderId(null);
    }, [team1Id, team2Id]);

    const getTeamWithFinalStats = (teamId: string | null) => {
        if (!teamId) return null;
        const team = teams.find(t => t.id === teamId);
        if (!team) return null;

        const playersWithFinalStats = team.players.map(p => calculateFinalStats(p, team.players, inventory));
        return { ...team, players: playersWithFinalStats };
    };

    const team1 = useMemo(() => getTeamWithFinalStats(team1Id), [team1Id, teams, inventory]);
    const team2 = useMemo(() => getTeamWithFinalStats(team2Id), [team2Id, teams, inventory]);

    useEffect(() => {
        if (!attackerId || !defenderId || !team1 || !team2) {
            setDamageCalculation(null);
            return;
        }

        const finalAttacker = team1.players.find(p => p.id === attackerId);
        const finalDefender = team2.players.find(p => p.id === defenderId);
        
        // Find original players to show base stats
        const originalTeam1 = teams.find(t => t.id === team1Id);
        const originalTeam2 = teams.find(t => t.id === team2Id);
        const baseAttacker = originalTeam1?.players.find(p => p.id === attackerId);
        const baseDefender = originalTeam2?.players.find(p => p.id === defenderId);

        if (!finalAttacker || !finalDefender || !baseAttacker || !baseDefender) {
            setDamageCalculation(null);
            return;
        }

        const log: string[] = [];
        let finalDamage = 0;
        let effectiveDefense = finalDefender.defense;

        log.push(`Attacker: ${finalAttacker.name} (Base ATK: ${baseAttacker.attack} -> Final ATK: ${finalAttacker.attack})`);
        log.push(`Defender: ${finalDefender.name} (Base DEF: ${baseDefender.defense} -> Final DEF: ${finalDefender.defense})`);
        log.push(`---`);

        // Check for Lion's Set 4-piece bonus
        const attackerBonuses = getActiveSetBonuses(finalAttacker, inventory);
        const hasLions4Set = attackerBonuses.some(b => b.setName === "Lion's Set" && b.count === 4);

        if (hasLions4Set) {
            const defenseReduction = Math.floor(effectiveDefense * 0.20);
            effectiveDefense -= defenseReduction;
            log.push(`Lion's Set (4-pc): Defender's DEF reduced by ${defenseReduction} (20%). New DEF: ${effectiveDefense}.`);
        }

        // Basic damage formula: Attacker's ATK - Defender's effective DEF
        // Damage cannot be negative.
        finalDamage = Math.max(0, finalAttacker.attack - effectiveDefense);
        log.push(`Damage Formula: max(0, Attacker's Final ATK - Defender's Effective DEF)`);
        log.push(`Calculation: max(0, ${finalAttacker.attack} - ${effectiveDefense}) = ${finalDamage}`);

        setDamageCalculation({ log, finalDamage });

    }, [attackerId, defenderId, team1, team2, inventory]);


    const calculateTeamSummary = (team: TeamWithPlayers | null) => {
        if (!team || team.players.length === 0) {
            return { totalHealth: 0, totalAttack: 0, totalDefense: 0, avgAttack: 0, avgDefense: 0 };
        }
        const totalHealth = team.players.reduce((sum, p) => sum + p.health, 0);
        const totalAttack = team.players.reduce((sum, p) => sum + p.attack, 0);
        const totalDefense = team.players.reduce((sum, p) => sum + p.defense, 0);
        const avgAttack = totalAttack / team.players.length;
        const avgDefense = totalDefense / team.players.length;
        return { totalHealth, totalAttack, totalDefense, avgAttack, avgDefense };
    }

    const team1Summary = useMemo(() => calculateTeamSummary(team1), [team1]);
    const team2Summary = useMemo(() => calculateTeamSummary(team2), [team2]);

    const TeamSummaryCard = ({ teamName, summary }: { teamName: string, summary: ReturnType<typeof calculateTeamSummary> }) => (
        <Card>
            <CardHeader><CardTitle>{teamName}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
                <p className="flex justify-between"><span>Total Health:</span> <strong>{summary.totalHealth.toLocaleString()}</strong></p>
                <p className="flex justify-between"><span>Total Attack:</span> <strong>{summary.totalAttack.toLocaleString()}</strong></p>
                <p className="flex justify-between"><span>Total Defense:</span> <strong>{summary.totalDefense.toLocaleString()}</strong></p>
                <hr className="my-2" />
                <p className="flex justify-between"><span>Avg. Attack:</span> <strong>{summary.avgAttack.toFixed(0)}</strong></p>
                <p className="flex justify-between"><span>Avg. Defense:</span> <strong>{summary.avgDefense.toFixed(0)}</strong></p>
            </CardContent>
        </Card>
    );

    return (
        <div className="min-h-screen bg-background p-4">
            <div className="max-w-7xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold text-primary">Battle Calculator</h1>

                {/* Team Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle>Select Teams</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-4">
                        <Select onValueChange={setTeam1Id} value={team1Id ?? undefined}>
                            <SelectTrigger><SelectValue placeholder="Select Team 1" /></SelectTrigger>
                            <SelectContent>
                                {teams.map(team => <SelectItem key={team.id} value={team.id} disabled={team.id === team2Id}>{team.team_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select onValueChange={setTeam2Id} value={team2Id ?? undefined}>
                            <SelectTrigger><SelectValue placeholder="Select Team 2" /></SelectTrigger>
                            <SelectContent>
                                {teams.map(team => <SelectItem key={team.id} value={team.id} disabled={team.id === team1Id}>{team.team_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {/* Damage Calculation */}
                {damageCalculation && (
                    <Card className="bg-secondary">
                        <CardHeader>
                            <CardTitle>Damage Calculation</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="font-mono text-xs space-y-1 bg-background p-3 rounded-md">
                                {damageCalculation.log.map((line, i) => <p key={i}>{line}</p>)}
                            </div>
                            <p className="text-center text-2xl font-bold">Final Damage: <span className="text-destructive">{damageCalculation.finalDamage.toLocaleString()}</span></p>
                        </CardContent>
                    </Card>
                )}

                {/* Summary */}
                {team1 && team2 && (
                    <div className="grid md:grid-cols-2 gap-6">
                        <TeamSummaryCard teamName={team1.team_name} summary={team1Summary} />
                        <TeamSummaryCard teamName={team2.team_name} summary={team2Summary} />
                    </div>
                )}


                {/* Team Rosters */}
                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle>{team1?.team_name || "Team 1"}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {team1 ? team1.players.map(p => (
                                <PlayerCard
                                    key={p.id}
                                    player={p}
                                    isSelected={attackerId === p.id}
                                    selectionColor="blue"
                                    onClick={() => setAttackerId(p.id)} />
                            )) : <p className="text-muted-foreground">Select a team</p>}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>{team2?.team_name || "Team 2"}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {team2 ? team2.players.map(p => (
                                <PlayerCard
                                    key={p.id}
                                    player={p}
                                    isSelected={defenderId === p.id}
                                    selectionColor="red"
                                    onClick={() => setDefenderId(p.id)} />
                            )) : <p className="text-muted-foreground">Select a team</p>}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}