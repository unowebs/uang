/* ==========================================================================
   FinTrack - PDF & Print Recap Exporter
   ========================================================================== */

import { formatRupiah, store } from './store.js';

export function exportRecapToPDF(filteredTxs, startDate, endDate) {
  const summary = store.calculateSummary(filteredTxs);
  const user = store.currentUser ? store.currentUser.name : 'Pengguna FinTrack';
  const room = store.activeRoom ? `Room: ${store.activeRoom}` : 'Keuangan Pribadi';
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up terblokir. Izinkan pop-up untuk mengunduh PDF.');
    return;
  }

  const tableRowsHtml = filteredTxs.map((tx, idx) => {
    const cat = store.getCategoryById(tx.categoryId);
    const d = new Date(tx.datetime).toLocaleString('id-ID');
    const isIncome = tx.type === 'income';
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${d}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${tx.title}</strong><br><small style="color: #666;">${tx.note || ''}</small></td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${cat.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; color: ${isIncome ? '#10b981' : '#f43f5e'}; font-weight: bold;">
          ${isIncome ? 'Pemasukan' : 'Pengeluaran'}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold; color: ${isIncome ? '#10b981' : '#f43f5e'};">
          ${isIncome ? '+' : '-'} ${formatRupiah(tx.amount)}
        </td>
      </tr>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Laporan_Keuangan_FinTrack_${new Date().toISOString().slice(0, 10)}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #4f46e5; font-size: 24px; }
        .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }
        .metrics { display: flex; gap: 15px; margin-bottom: 25px; }
        .metric-box { flex: 1; padding: 12px; border-radius: 8px; text-align: center; background: #f1f5f9; }
        .metric-box.net { background: #e0e7ff; color: #3730a3; }
        .metric-box.income { background: #d1fae5; color: #065f46; }
        .metric-box.expense { background: #ffe4e6; color: #9f1239; }
        .metric-box h4 { margin: 0 0 5px 0; font-size: 11px; text-transform: uppercase; }
        .metric-box p { margin: 0; font-size: 18px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 30px; }
        th { background: #4f46e5; color: #fff; padding: 10px; text-align: left; }
        .footer { text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>FinTrack ID</h1>
          <p style="margin: 3px 0 0 0; font-size: 13px; color: #64748b;">Laporan Rekapan Keuangan Resmi</p>
        </div>
        <div style="text-align: right; font-size: 12px; color: #64748b;">
          Dicetak: ${new Date().toLocaleString('id-ID')}
        </div>
      </div>

      <div class="meta-box">
        <div><strong>Nama Pengguna:</strong> ${user}</div>
        <div><strong>Konteks Data:</strong> ${room}</div>
        <div><strong>Periode Laporan:</strong> ${startDate || 'Awal'} s/d ${endDate || 'Sekarang'}</div>
        <div><strong>Total Transaksi:</strong> ${filteredTxs.length} Transaksi</div>
      </div>

      <div class="metrics">
        <div class="metric-box net">
          <h4>Saldo Bersih</h4>
          <p>${formatRupiah(summary.netBalance)}</p>
        </div>
        <div class="metric-box income">
          <h4>Total Pemasukan</h4>
          <p>${formatRupiah(summary.totalIncome)}</p>
        </div>
        <div class="metric-box expense">
          <h4>Total Pengeluaran</h4>
          <p>${formatRupiah(summary.totalExpense)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th style="width: 140px;">Tanggal & Jam</th>
            <th>Keterangan Transaksi</th>
            <th>Kategori</th>
            <th style="text-align: center;">Jenis</th>
            <th style="text-align: right;">Jumlah (Rp)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <div class="footer">
        FinTrack ID Financial Management System &bull; Dokumen Dihasilkan Secara Otomatis
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
