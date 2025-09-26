import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

// Data from AdminDashboard.tsx
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

// Data from AdminDashboard.tsx
const artifactSets = {
  "Lion's Set": { "2-set": "Gains ATK +50", "4-set": "Ignores 20% of enemy defense" },
  "Angel in White Set": { "2-set": "Gains HP +250", "4-set": "Reduces own ATK by 10%, increases allies' ATK by 15%" },
  "Golden Gladiator Set": { "2-set": "Gains DEF +30", "4-set": "Reduces own HP by 200, increases allies' DEF by 20" },
  "Destroyer Set": { "2-set": "Power gauge rate increases by 10%", "4-set": "Starts battle with 30% power gauge" },
  "Red Panther Set": { "2-set": "Gains ATK +15 and DEF +15", "4-set": "Reduces own HP by 200, gains an additional ATK +15 and DEF +15" }
};

// Data from AddMembers.tsx and user request
const classes = {
  warrior: {
    name: 'Fighter',
    stats: { health: 120, mana: 30, attack: 12, defense: 8 },
    passive: 'Gains 10% ATK after landing an attack (Always active)',
    active: 'Double attack (Once every 3 turns)',
    skill: 'Skill (Once per match)',
  },
  tank: {
    name: 'Tank',
    stats: { health: 150, mana: 20, attack: 8, defense: 15 }, // Example stats, can be adjusted
    passive: 'Reduces incoming damage by 25% (Always active)',
    active: 'Taunt (all enemies can only target the tank for 1 turn) (Once every 3 turns)',
    skill: 'Skill (Once per match)',
  },
  healer: {
    name: 'Healer',
    stats: { health: 90, mana: 70, attack: 7, defense: 5 }, // Example stats, can be adjusted
    passive: "All attacks heal teammates instead (healing is same as ATK) (Always active)",
    active: "Buff (increases teammates' attack by 50) (Once every 3 turns)",
    skill: 'Skill (Once per match)',
  },
  mage: {
    name: 'Mage',
    stats: { health: 80, mana: 80, attack: 8, defense: 4 },
    passive: 'Reduces defence by 25% for 1 turn (Always active)',
    active: 'Blocks all abilities for one target (Once every 3 turns)',
    skill: 'Skill (Once per match)',
  },
  archer: {
    name: 'Ranger',
    stats: { health: 90, mana: 40, attack: 10, defense: 5 },
    passive: "Poison target for 20 DMG per turn (doesn't stack, 2 turns) (Always active)",
    active: 'Rain of arrows (hits all enemies, no poison) (Once every 3 turns)',
    skill: 'Skill (Once per match)',
  },
  assassin: {
    name: 'Assassin',
    stats: { health: 85, mana: 50, attack: 11, defense: 4 },
    passive: 'Always goes first (Always active)',
    active: 'Camouflage (goes invis and can target backrank) (Once every 3 turns)',
    skill: 'Skill (Once per match)',
  },
  berserker: {
    name: 'Berserker',
    stats: { health: 100, mana: 20, attack: 15, defense: 3 },
    passive: 'Gains 10% ATK after landing an attack (Always active)', // Example from Fighter
    active: 'Double attack (Once every 3 turns)', // Example from Fighter
    skill: 'Skill (Once per match)',
  },
  paladin: {
    name: 'Paladin',
    stats: { health: 110, mana: 60, attack: 10, defense: 7 },
    passive: 'Reduces incoming damage by 15% (Always active)', // Example from Tank
    active: 'Taunt (all enemies can only target the paladin for 1 turn) (Once every 3 turns)', // Example from Tank
    skill: 'Skill (Once per match)',
  },
};

export default function GameData() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-primary">Game Data</h1>
          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="classes">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          </TabsList>

          <TabsContent value="classes">
            <Card>
              <CardHeader>
                <CardTitle>Character Classes</CardTitle>
                <CardDescription>Details about each available class.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.values(classes).map((c) => (
                  <Card key={c.name} className="p-4">
                    <CardTitle className="capitalize">{c.name}</CardTitle>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      {Object.entries(c.stats).map(([stat, value]) => <p key={stat}><span className="font-semibold capitalize">{stat}:</span> {value}</p>)}
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      <p><Badge variant="outline">Passive</Badge> {c.passive}</p>
                      <p><Badge variant="outline">Active</Badge> {c.active}</p>
                      <p><Badge variant="outline">Skill</Badge> {c.skill}</p>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skills">
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
                <CardDescription>All available skills and their effects by rarity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(skills).map(([name, rarities]) => (
                  <Card key={name} className="p-4">
                    <CardTitle>{name}</CardTitle>
                    <div className="mt-2 space-y-1 text-sm">
                      <p><Badge className="text-rare bg-rare/10">Rare:</Badge> {rarities.rare}</p>
                      <p><Badge className="text-epic bg-epic/10">Epic:</Badge> {rarities.epic}</p>
                      <p><Badge className="text-legendary bg-legendary/10">Legendary:</Badge> {rarities.legendary}</p>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="artifacts">
            <Card>
              <CardHeader>
                <CardTitle>Artifact Sets</CardTitle>
                <CardDescription>Bonuses for collecting artifact sets.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(artifactSets).map(([name, bonuses]) => (
                  <Card key={name} className="p-4">
                    <CardTitle>{name}</CardTitle>
                    <div className="mt-2 space-y-1 text-sm">
                      <p><Badge variant="secondary">2-Set Bonus:</Badge> {bonuses['2-set']}</p>
                      <p><Badge variant="secondary">4-Set Bonus:</Badge> {bonuses['4-set']}</p>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}