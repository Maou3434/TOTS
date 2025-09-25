import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Users } from 'lucide-react';
import { Constants } from '@/integrations/supabase/types';

interface MemberState {
  name: string;
  characterClass: string;
}

const baseStatsByClass: Record<string, Omit<Database['public']['Tables']['players']['Insert'], 'id' | 'team_id' | 'name' | 'character_class'>> = {
  warrior: { health: 120, mana: 30, attack: 12, defense: 8 },
  mage: { health: 80, mana: 80, attack: 8, defense: 4 },
  archer: { health: 90, mana: 40, attack: 10, defense: 5 },
  assassin: { health: 85, mana: 50, attack: 11, defense: 4 },
  paladin: { health: 110, mana: 60, attack: 10, defense: 7 },
  berserker: { health: 100, mana: 20, attack: 15, defense: 3 },
};

import { Database } from '@/integrations/supabase/types';

export default function AddMembers() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [members, setMembers] = useState<MemberState[]>([
    { name: '', characterClass: '' },
    { name: '', characterClass: '' },
    { name: '', characterClass: '' },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleMemberChange = (index: number, field: keyof MemberState, value: string) => {
    const newMembers = [...members];
    newMembers[index][field] = value;
    setMembers(newMembers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!teamId) {
      toast({ title: 'Error', description: 'Team ID is missing.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const memberRecords = members
      .filter(member => member.name.trim() !== '' && member.characterClass.trim() !== '')
      .map(member => {
        const classStats = baseStatsByClass[member.characterClass];
        return {
          team_id: teamId,
          name: member.name.trim(),
          character_class: member.characterClass as Database['public']['Enums']['character_class'],
          ...classStats,
        };
      });

    if (memberRecords.length < 3) {
      toast({ title: 'Incomplete Team', description: 'Please provide a name and class for all three members.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.from('players').insert(memberRecords);

    if (error) {
      toast({
        title: 'Failed to add members',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Team assembled!',
        description: 'Your team and members have been created. You can now log in.',
      });
      navigate('/auth');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
            <Users /> Assemble Your Team
          </CardTitle>
          <CardDescription>Your team has been created. Now, name your three members.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {members.map((member, index) => (
              <div key={index} className="space-y-2">
                <Label htmlFor={`member-${index + 1}`}>Member {index + 1} Name</Label>
                <Input
                  id={`member-${index + 1}`}
                  value={member.name}
                  onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                  placeholder={`Enter name for member ${index + 1}`}
                  required
                />
                <Select
                  value={member.characterClass}
                  onValueChange={(value) => handleMemberChange(index, 'characterClass', value)}
                  required
                >
                  <SelectTrigger><SelectValue placeholder={`Select class for member ${index + 1}`} /></SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.character_class.map(charClass => (
                      <SelectItem key={charClass} value={charClass} className="capitalize">{charClass}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Assembling...' : 'Complete Registration'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}