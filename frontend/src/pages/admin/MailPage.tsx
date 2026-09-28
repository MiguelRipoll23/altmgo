import { Mail, Pencil, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, describeError } from '../../api';
import { DataTable, Panel, SectionHeading, formatDate } from '../../components/DataDisplay';
import { StatusMessage } from '../../components/StatusMessage';
import { useApiResource } from '../../components/useApiResource';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { readSessionToken } from '../../session';

/** One letter in the game masters' mailbox. */
type MailMessage = {
  id: number;
  subject: string;
  body: string;
  senderName: string;
  /** Who wrote it, or nothing for a letter the console wrote. */
  senderCharacterId: number | null;
  /** The name of that character, where there is one. */
  senderCharacterName: string | null;
  sentAt: string;
};

/** Which side of the mailbox is being read. */
export type MailBox = 'inbox' | 'outbox';

/** What each side is called, and the sentence the page opens with for it. */
const boxes: Record<MailBox, { title: string; subtitle: string; empty: string }> = {
  inbox: {
    title: 'Player mail',
    subtitle: 'Letters players have written to the game masters.',
    empty: 'No player has written to the game masters.',
  },
  outbox: {
    title: 'Console mail',
    subtitle: 'The letters written into the mailbox from the dashboard.',
    empty: 'The console has not written any letters.',
  },
};

/**
 * The game masters' mailbox, one side of it at a time.
 *
 * The table is one mailbox holding two kinds of letter, and they are not the same
 * thing: a player writes a letter to the game masters and the game stores it here
 * unread by anybody until a manager opens this page, while a letter written from
 * the console sits in the same table with no sender on it. One operator answering
 * a player and one operator checking what the server has said are different
 * questions, and the answer to "what is in here" is different for each — so the
 * side is a page of its own rather than a filter, and the sidebar's sub-options
 * are where it is chosen.
 *
 * The inbox is the side that did not exist here before: until now the console
 * wrote into this table and read back its own letters, and the mail players had
 * actually sent sat in the same rows unread. That is the half of the mailbox a
 * game master answers and the half that was missing.
 *
 * A letter can be corrected or removed from either side. Removing one withdraws
 * the copies sitting in players' inboxes as well, and the sentence that comes
 * back says how many that was, because the copies leaving a list of inboxes is the
 * half of the action nobody sees.
 */
export function AdminMailPage({ box = 'inbox' }: { box?: MailBox }) {
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<MailMessage | null>(null);

  const mail = useApiResource<{ mail: MailMessage[] }>(`/api/manager/mail?box=${box}`);

  async function write(
    action: () => Promise<{ message?: string } | unknown>,
    done: string,
  ) {
    setBusy(true);
    setStatus(null);

    try {
      const result = (await action()) as { message?: string } | undefined;
      setStatus({ kind: 'success', message: result?.message ?? done });
      setEditing(null);
      mail.reload();
    } catch (caught) {
      setStatus({ kind: 'error', message: describeError(caught) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading title={boxes[box].title} subtitle={boxes[box].subtitle} />

      {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}

      {box === 'outbox' ? (
        <MailComposer
          busy={busy}
          onSend={(subject, body, senderName) =>
            write(
              () =>
                apiRequest('/api/manager/mail', {
                  method: 'POST',
                  token: readSessionToken(),
                  body: { subject, body, senderName },
                }),
              'The letter was written to the mailbox.',
            )
          }
        />
      ) : null}

      {editing === null ? null : (
        <MailEditor
          item={editing}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={(subject, body, senderName) =>
            write(
              () =>
                apiRequest(`/api/manager/mail/${editing.id}`, {
                  method: 'PUT',
                  token: readSessionToken(),
                  body: { subject, body, senderName },
                }),
              'The letter was corrected.',
            )
          }
        />
      )}

      <Panel title={box === 'inbox' ? 'Letters to the game masters' : 'Letters from the console'}>
        {mail.error === null ? null : <StatusMessage kind="error">{mail.error}</StatusMessage>}

        <DataTable
          rows={mail.data?.mail ?? []}
          rowKey={(row) => row.id}
          empty={boxes[box].empty}
          loading={mail.loading}
          loadingLabel="Reading the mailbox…"
          columns={[
            {
              header: 'Subject',
              cell: (row) => (
                <Link
                  to={`/admin/mail/${row.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {row.subject}
                </Link>
              ),
            },
            { header: 'From', cell: (row) => row.senderCharacterName ?? row.senderName },
            { header: 'Sent', cell: (row) => formatDate(row.sentAt) },
            {
              header: 'Actions',
              className: 'text-right',
              cell: (row) => (
                <span className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => setEditing(row)}
                  >
                    <Pencil />
                    Edit
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={busy}>
                        <Trash2 />
                        Remove
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>Remove “{row.subject}”?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The letter leaves the mailbox, and any copy of it in a player&rsquo;s
                        inbox is withdrawn from view. The sentence that comes back says how many
                        inboxes that was.
                      </AlertDialogDescription>
                      <div className="flex justify-end gap-2">
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            write(
                              () =>
                                apiRequest(`/api/manager/mail/${row.id}`, {
                                  method: 'DELETE',
                                  token: readSessionToken(),
                                }),
                              'The letter was removed.',
                            )
                          }
                        >
                          Remove
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </span>
              ),
            },
          ]}
        />
      </Panel>
    </div>
  );
}

/**
 * The form that writes a letter into the mailbox.
 *
 * The sender name is typed rather than filled from the deployment's name because it
 * is the figure a reader sees against the letter, and "from the server" is a worse
 * signature than the one the operators of this server have chosen.
 */
function MailComposer({
  busy,
  onSend,
}: {
  busy: boolean;
  onSend: (subject: string, body: string, senderName: string) => void;
}) {
  const [senderName, setSenderName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const ready =
    senderName.trim().length > 0 && subject.trim().length > 0 && body.trim().length > 0;

  return (
    <Panel title="Write a letter" description="It joins the game masters' mailbox with no sender character on it.">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mail-sender">Sender</Label>
          <Input
            id="mail-sender"
            type="text"
            value={senderName}
            onChange={(event) => setSenderName(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mail-subject">Subject</Label>
          <Input
            id="mail-subject"
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mail-body">Body</Label>
          <Textarea
            id="mail-body"
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>

        <Button
          disabled={busy || !ready}
          onClick={() => {
            onSend(subject.trim(), body.trim(), senderName.trim());
            setSenderName('');
            setSubject('');
            setBody('');
          }}
        >
          <Send />
          Write
        </Button>
      </div>
    </Panel>
  );
}

/** The form that corrects one letter, filled in with the letter's own words. */
function MailEditor({
  item,
  busy,
  onSave,
  onCancel,
}: {
  item: MailMessage;
  busy: boolean;
  onSave: (subject: string, body: string, senderName: string) => void;
  onCancel: () => void;
}) {
  const [subject, setSubject] = useState(item.subject);
  const [body, setBody] = useState(item.body);
  const [senderName, setSenderName] = useState(item.senderName);

  const ready =
    subject.trim().length > 0 && body.trim().length > 0 && senderName.trim().length > 0;

  return (
    <Panel
      title={`Correct “${item.subject}”`}
      description="The letter is corrected in place: the date it was sent does not change."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-mail-sender">Sender</Label>
          <Input
            id="edit-mail-sender"
            type="text"
            value={senderName}
            onChange={(event) => setSenderName(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-mail-subject">Subject</Label>
          <Input
            id="edit-mail-subject"
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-mail-body">Body</Label>
          <Textarea
            id="edit-mail-body"
            rows={6}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button
            disabled={busy || !ready}
            onClick={() => onSave(subject.trim(), body.trim(), senderName.trim())}
          >
            <Mail />
            Save the correction
          </Button>

          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Panel>
  );
}
