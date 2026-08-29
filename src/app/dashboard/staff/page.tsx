'use client';

import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useMarketContext } from '@/context/market-context';
import { ApiError, apiClient } from '@/lib/api-client';
import type { MarketStaff, MarketStaffInvitation } from '@/lib/types';

const INVITATION_STATUS_LABEL: Record<MarketStaffInvitation['status'], string> = {
  pending: 'Menunggu',
  expired: 'Kedaluwarsa',
  accepted: 'Diterima',
};

function InvitationStatusBadge({ status }: { status: MarketStaffInvitation['status'] }) {
  if (status === 'accepted') {
    return <Badge className="bg-brand-success text-white">{INVITATION_STATUS_LABEL[status]}</Badge>;
  }
  if (status === 'expired') {
    return (
      <Badge variant="outline" className="border-brand-error text-brand-error">
        {INVITATION_STATUS_LABEL[status]}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-brand-info text-brand-info">
      {INVITATION_STATUS_LABEL[status]}
    </Badge>
  );
}

export default function StaffPage() {
  const { activeMarket, isOwner, loading: marketLoading } = useMarketContext();

  const [staff, setStaff] = useState<MarketStaff[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [invitations, setInvitations] = useState<MarketStaffInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<MarketStaff | null>(null);

  const loadStaff = useCallback(async () => {
    if (!activeMarket) {
      setStaff([]);
      return;
    }
    setStaffLoading(true);
    try {
      const data = await apiClient<MarketStaff[]>(`/api/markets/${activeMarket.id}/staff`);
      setStaff(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memuat daftar staff.');
    } finally {
      setStaffLoading(false);
    }
  }, [activeMarket]);

  const loadInvitations = useCallback(async () => {
    if (!activeMarket) {
      setInvitations([]);
      return;
    }
    setInvitationsLoading(true);
    try {
      const data = await apiClient<MarketStaffInvitation[]>(
        `/api/markets/${activeMarket.id}/staff/invitations`,
      );
      setInvitations(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memuat daftar undangan.');
    } finally {
      setInvitationsLoading(false);
    }
  }, [activeMarket]);

  useEffect(() => {
    void loadStaff();
    void loadInvitations();
  }, [loadStaff, loadInvitations]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!activeMarket) return;

    setInviting(true);
    try {
      await apiClient(`/api/markets/${activeMarket.id}/staff`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      toast.success(`Undangan terkirim ke ${email.trim()}.`);
      setEmail('');
      await loadInvitations();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengundang staff.');
    } finally {
      setInviting(false);
    }
  }

  async function confirmRemove() {
    if (!activeMarket || !pendingRemoval) return;
    const staffMember = pendingRemoval;

    setRemovingId(staffMember.id);
    try {
      await apiClient(`/api/markets/${activeMarket.id}/staff/${staffMember.id}`, {
        method: 'DELETE',
      });
      toast.success(`${staffMember.email} dihapus dari Market.`);
      setPendingRemoval(null);
      await loadStaff();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus staff.');
    } finally {
      setRemovingId(null);
    }
  }

  if (marketLoading) {
    return <LoadingSpinner label="Memuat…" />;
  }

  // Backend adalah penjaga sebenarnya (403 kalau bukan Owner) — pengecekan
  // di sini murni UX supaya Staff tidak melihat halaman yang bukan haknya.
  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Akses Ditolak</CardTitle>
          <CardDescription>
            Halaman ini hanya untuk Owner. Staff Market tidak dapat menambah atau menghapus staff lain.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!activeMarket) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Belum ada Market aktif</CardTitle>
          <CardDescription>Buat atau pilih Market dulu di Market Settings.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Undang Staff</CardTitle>
          <CardDescription>
            Kelola staff untuk Market <strong>{activeMarket.name}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="invite-email">Email Staff</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@contoh.com"
              />
            </div>
            <Button type="submit" disabled={inviting}>
              {inviting ? 'Mengundang…' : 'Undang'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Staff</CardTitle>
        </CardHeader>
        <CardContent>
          {staffLoading ? (
            <LoadingSpinner />
          ) : staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada staff terdaftar di Market ini.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Bergabung</TableHead>
                  <TableHead className="w-16 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{new Date(member.created_at).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={removingId === member.id}
                        onClick={() => setPendingRemoval(member)}
                        aria-label={`Hapus ${member.email}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Undangan Tertunda</CardTitle>
          <CardDescription>Staff yang sudah diundang tapi belum (atau sudah) menerima undangan.</CardDescription>
        </CardHeader>
        <CardContent>
          {invitationsLoading ? (
            <LoadingSpinner />
          ) : invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada undangan yang dikirim.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Diundang</TableHead>
                  <TableHead>Kedaluwarsa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>
                      <InvitationStatusBadge status={invitation.status} />
                    </TableCell>
                    <TableCell>{new Date(invitation.created_at).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell>{new Date(invitation.expires_at).toLocaleDateString('id-ID')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={pendingRemoval !== null} onOpenChange={(open) => !open && setPendingRemoval(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus staff?</DialogTitle>
            <DialogDescription>
              {pendingRemoval
                ? `${pendingRemoval.email} akan kehilangan akses ke Market "${activeMarket.name}". Tindakan ini tidak bisa dibatalkan.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRemoval(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={removingId === pendingRemoval?.id}
              onClick={confirmRemove}
            >
              {removingId === pendingRemoval?.id ? 'Menghapus…' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
