import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Users } from 'lucide-react';

export default function AddMembers() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [members, setMembers] = useState(['', '', '']);
  const [isLoading, setIsLoading] = useState(false);

  const handleMemberNameChange = (index: number, name: string) => {
    const newMembers = [...members];
    newMembers[index] = name;
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
      .filter(name => name.trim() !== '')
      .map(name => ({
        team_id: teamId,
        name: name.trim(),
      }));

    if (memberRecords.length !== 3) {
      toast({ title: 'Incomplete Team', description: 'Please enter names for all three members.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.from('team_members').insert(memberRecords);

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
            {members.map((name, index) => (
              <div key={index}>
                <Label htmlFor={`member-${index + 1}`}>Member {index + 1} Name</Label>
                <Input
                  id={`member-${index + 1}`}
                  value={name}
                  onChange={(e) => handleMemberNameChange(index, e.target.value)}
                  placeholder={`Enter name for member ${index + 1}`}
                  required
                />
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