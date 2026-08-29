import { redirect } from 'next/navigation';

// Fase 0 belum punya halaman ringkasan dashboard sendiri — cukup arahkan ke
// Market Settings (halaman utama yang selalu relevan baik untuk Owner
// maupun Staff). Revisit kalau Fase berikutnya butuh halaman ringkasan.
export default function DashboardIndexPage() {
  redirect('/dashboard/market-settings');
}
