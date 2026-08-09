/* ==========================================================================
   FinTrack - PDF Exporter (uses jsPDF + html2canvas for direct PDF download)
   ========================================================================== */

import { formatRupiah, formatMoney, store } from './store.js';

/**
 * Loads a script dynamically and returns a promise.
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export async function exportRecapToPDF(filteredTxs, startDate, endDate) {
  const summary = store.calculateSummary(filteredTxs);
  const user    = store.currentUser ? store.currentUser.name : 'Pengguna FinTrack';
  const room    = store.activeRoom ? `Room: ${store.activeRoom}` : 'Keuangan Pribadi';

  // Ensure libraries are loaded
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  } catch (e) {
    alert('Gagal memuat library PDF. Periksa koneksi internet Anda.');
    return;
  }

  // Build an off-screen container with the report HTML
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: 900px; background: #fff;
    font-family: 'Segoe UI', Tahoma, sans-serif;
    color: #1e293b; padding: 32px; box-sizing: border-box;
  `;

  const tableRowsHtml = filteredTxs.map((tx, idx) => {
    const cat     = store.getCategoryById(tx.categoryId);
    const d       = new Date(tx.datetime).toLocaleString('id-ID');
    const isIncome = tx.type === 'income';
    return `
      <tr>
        <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;text-align:center;">${idx + 1}</td>
        <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;">${d}</td>
        <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;">
          <strong style="font-size:13px;">${tx.title}</strong>
          ${tx.note ? `<br><span style="font-size:11px;color:#64748b;">${tx.note}</span>` : ''}
        </td>
        <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;">${cat.name}</td>
        <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700;font-size:12px;color:${isIncome ? '#10b981' : '#f43f5e'};">
          ${isIncome ? 'Pemasukan' : 'Pengeluaran'}
        </td>
        <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;font-size:13px;color:${isIncome ? '#10b981' : '#f43f5e'};">
          ${isIncome ? '+' : '-'} ${formatMoney(tx.amount, tx.currency || 'IDR')}
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #6366f1;padding-bottom:14px;margin-bottom:18px;">
      <div>
        <div style="font-size:22px;font-weight:800;color:#4f46e5;">FinTrack ID</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px;">Laporan Rekapan Keuangan Resmi</div>
      </div>
      <div style="text-align:right;font-size:11px;color:#64748b;">
        Dicetak: ${new Date().toLocaleString('id-ID')}
      </div>
    </div>

    <!-- Meta -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px;border-radius:8px;margin-bottom:18px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
      <div><strong>Nama Pengguna:</strong> ${user}</div>
      <div><strong>Konteks Data:</strong> ${room}</div>
      <div><strong>Periode Laporan:</strong> ${startDate || 'Awal'} s/d ${endDate || 'Sekarang'}</div>
      <div><strong>Total Transaksi:</strong> ${filteredTxs.length} Transaksi</div>
    </div>

    <!-- Metrics -->
    <div style="display:flex;gap:12px;margin-bottom:20px;">
      <div style="flex:1;padding:12px;border-radius:8px;text-align:center;background:#e0e7ff;">
        <div style="font-size:10px;text-transform:uppercase;font-weight:700;color:#3730a3;">Saldo Bersih</div>
        <div style="font-size:17px;font-weight:800;color:#3730a3;margin-top:4px;">${formatRupiah(summary.netBalance)}</div>
      </div>
      <div style="flex:1;padding:12px;border-radius:8px;text-align:center;background:#d1fae5;">
        <div style="font-size:10px;text-transform:uppercase;font-weight:700;color:#065f46;">Total Pemasukan</div>
        <div style="font-size:17px;font-weight:800;color:#065f46;margin-top:4px;">${formatRupiah(summary.totalIncome)}</div>
      </div>
      <div style="flex:1;padding:12px;border-radius:8px;text-align:center;background:#ffe4e6;">
        <div style="font-size:10px;text-transform:uppercase;font-weight:700;color:#9f1239;">Total Pengeluaran</div>
        <div style="font-size:17px;font-weight:800;color:#9f1239;margin-top:4px;">${formatRupiah(summary.totalExpense)}</div>
      </div>
    </div>

    <!-- Table -->
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px;">
      <thead>
        <tr>
          <th style="background:#4f46e5;color:#fff;padding:10px 8px;text-align:center;width:36px;">#</th>
          <th style="background:#4f46e5;color:#fff;padding:10px 8px;width:130px;">Tanggal &amp; Jam</th>
          <th style="background:#4f46e5;color:#fff;padding:10px 8px;">Keterangan</th>
          <th style="background:#4f46e5;color:#fff;padding:10px 8px;">Kategori</th>
          <th style="background:#4f46e5;color:#fff;padding:10px 8px;text-align:center;">Jenis</th>
          <th style="background:#4f46e5;color:#fff;padding:10px 8px;text-align:right;">Jumlah</th>
        </tr>
      </thead>
      <tbody>${tableRowsHtml}</tbody>
    </table>

    <!-- Footer -->
    <div style="text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;">
      FinTrack ID Financial Management System &bull; Dokumen Dihasilkan Secara Otomatis
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageW  = pdf.internal.pageSize.getWidth();
    const pageH  = pdf.internal.pageSize.getHeight();
    const margin = 0;
    const imgW   = pageW - margin * 2;
    const imgH   = (canvas.height * imgW) / canvas.width;

    let yPos = margin;
    let remaining = imgH;

    while (remaining > 0) {
      const sliceH = Math.min(remaining, pageH - margin * 2);
      const srcY   = (imgH - remaining) / imgH * canvas.height;

      pdf.addImage(
        imgData, 'PNG',
        margin, yPos,
        imgW, sliceH,
        undefined, 'FAST',
        0, srcY / (imgH / canvas.height),
        canvas.width, sliceH / (imgH / canvas.height)
      );

      remaining -= sliceH;
      if (remaining > 0) { pdf.addPage(); yPos = margin; }
    }

    const fileName = `FinTrack_Laporan_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(fileName);
  } catch (err) {
    console.error('PDF generation error:', err);
    alert('Gagal membuat PDF. Silakan coba lagi.');
  } finally {
    document.body.removeChild(container);
  }
}

