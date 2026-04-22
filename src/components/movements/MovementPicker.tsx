import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useMovements } from '@/hooks/useMovements';
import { MovementFormDialog } from './MovementFormDialog';
import type { Movement } from '@/types/movements';

interface Props {
  value: string;                 // free-text exercise name
  movementId?: string | null;    // optional linked movement id
  onChange: (next: { name: string; movementId: string | null }) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Searchable picker that links a prescribed exercise to the Movement Library.
 * - Typing filters movements by name (case-insensitive substring).
 * - Selecting a movement stores both its name (denormalized) and movementId.
 * - Bottom row offers "Create new movement" which opens MovementFormDialog
 *   and auto-selects the newly created movement on save.
 * - If a value already exists with no movementId (legacy) it stays as-is
 *   until the coach picks a movement.
 */
export function MovementPicker({
  value,
  movementId,
  onChange,
  placeholder = 'Search exercise…',
  className,
}: Props) {
  const { movements, createMovement } = useMovements();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pendingNewName, setPendingNewName] = useState<string | null>(null);
  const createTriggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const linkedMovement = useMemo<Movement | null>(
    () => (movementId ? movements.find(m => m.id === movementId) || null : null),
    [movementId, movements],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? movements.filter(m => m.name.toLowerCase().includes(q))
      : movements;
    return list.slice(0, 50);
  }, [movements, query]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? movements.some(m => m.name.toLowerCase() === q) : true;
  }, [movements, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const select = (m: Movement) => {
    onChange({ name: m.name, movementId: m.id });
    setOpen(false);
  };

  const handleManualType = (text: string) => {
    setQuery(text);
    // Coach typing free text — clear movementId link until they pick one
    onChange({ name: text, movementId: null });
  };

  const openCreateDialog = (name: string) => {
    setPendingNewName(name);
    setOpen(false);
    // Defer click so popover closes first
    setTimeout(() => createTriggerRef.current?.click(), 50);
  };

  // After a new movement is created, auto-link by name match.
  useEffect(() => {
    if (!pendingNewName) return;
    const match = movements.find(
      m => m.name.toLowerCase() === pendingNewName.toLowerCase(),
    );
    if (match) {
      onChange({ name: match.name, movementId: match.id });
      setPendingNewName(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movements, pendingNewName]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2.5 text-sm text-left',
              'hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
              className,
            )}
          >
            <span className="flex items-center gap-1.5 min-w-0 flex-1">
              {linkedMovement?.thumbnail_url && (
                <img
                  src={linkedMovement.thumbnail_url}
                  alt=""
                  className="w-5 h-5 rounded object-cover shrink-0"
                />
              )}
              <span className={cn('truncate', !value && 'text-muted-foreground')}>
                {value || placeholder}
              </span>
              {linkedMovement && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-1 shrink-0">
                  linked
                </Badge>
              )}
            </span>
            <ChevronsUpDown className="w-3 h-3 text-muted-foreground shrink-0 ml-1" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[280px]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-2 px-2 border-b border-border">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => handleManualType(e.target.value)}
              placeholder="Search Movement Library…"
              className="h-9 border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            />
          </div>

          <div className="max-h-[280px] overflow-y-auto py-1">
            {filtered.length === 0 && !query && (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                No movements in library yet.
              </p>
            )}

            {filtered.map((m) => {
              const selected = m.id === movementId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => select(m)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-muted/60 transition-colors',
                    selected && 'bg-accent/30',
                  )}
                >
                  {m.thumbnail_url ? (
                    <img
                      src={m.thumbnail_url}
                      alt=""
                      className="w-8 h-8 rounded object-cover shrink-0 bg-muted"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <div className="flex gap-1 mt-0.5">
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {m.muscle_group}
                      </Badge>
                    </div>
                  </div>
                  {selected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              );
            })}

            {query && !exactMatch && (
              <button
                type="button"
                onClick={() => openCreateDialog(query.trim())}
                className="w-full flex items-center gap-2 px-2 py-2 mt-1 border-t border-border text-left hover:bg-primary/5 transition-colors"
              >
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">
                    Create "{query.trim()}"
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Add as new movement to library
                  </p>
                </div>
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Hidden trigger that opens the create-movement form.
          We use a key on pendingNewName so the form remounts and picks up
          the prefilled name each time. */}
      <MovementFormDialog
        key={pendingNewName || 'no-pending'}
        onSubmit={async (m) => {
          const err = await createMovement(m);
          return err;
        }}
        trigger={
          <button
            ref={createTriggerRef}
            type="button"
            className="hidden"
            aria-hidden="true"
          />
        }
      />
    </>
  );
}