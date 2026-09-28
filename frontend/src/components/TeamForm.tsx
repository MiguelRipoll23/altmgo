import { Plus } from 'lucide-react';
import { useState } from 'react';
import { apiRequest, describeError } from '../api';
import { readSessionToken } from '../session';
import { Panel } from './DataDisplay';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

/**
 * The form that forms a team in one lobby mode.
 *
 * The owner is named by character rather than chosen from a list of accounts: a
 * team is led by a character in the game world, and the server resolves the name
 * against the characters that exist, so an operator types the name the client shows.
 *
 * The mode is a number rather than a selector here, because the page this is drawn
 * on already is about one mode — the Survival teams page is the Survival ladder,
 * and a selector on it offering Tournament would be an event on this page that
 * belongs to another. Event operations is the one page about all three, and it is
 * where the choice belongs.
 */
export function CreateTeamPanel({
  mode,
  onCreated,
  onFailed,
}: {
  mode: number;
  onCreated: (message: string) => void;
  onFailed: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [comment, setComment] = useState('');
  const [creating, setCreating] = useState(false);

  async function create() {
    setCreating(true);

    try {
      await apiRequest('/api/moderator/teams', {
        method: 'POST',
        token: readSessionToken(),
        body: { mode, name: name.trim(), ownerName: owner.trim(), comment },
      });

      onCreated(`Team "${name.trim()}" was created.`);
      setName('');
      setOwner('');
      setComment('');
    } catch (caught) {
      onFailed(describeError(caught));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Panel title="Form a team">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`team-name-${mode}`}>Team name</Label>
          <Input
            id={`team-name-${mode}`}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`team-owner-${mode}`}>Leader</Label>
          <Input
            id={`team-owner-${mode}`}
            type="text"
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="Character name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`team-comment-${mode}`}>Comment</Label>
          <Input
            id={`team-comment-${mode}`}
            type="text"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </div>
      </div>

      <Button
        className="mt-4"
        onClick={() => void create()}
        disabled={creating || name.trim().length === 0 || owner.trim().length === 0}
      >
        <Plus />
        {creating ? 'Forming…' : 'Form team'}
      </Button>
    </Panel>
  );
}
