import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const DARK_NAVY  = [7,   9,  15]
const MID_NAVY   = [20,  30,  58]
const AMBER      = [245, 158,  11]
const AMBER_DARK = [180, 110,   5]
const WHITE      = [255, 255, 255]
const LIGHT_GREY = [200, 210, 225]
const DIM_GREY   = [120, 140, 165]
const GREEN      = [ 34, 197,  94]
const RED        = [239,  68,  68]
const ORANGE     = [249, 115,  22]

function fmt(n)  { return n ? Number(n).toLocaleString() : '—' }
function fmtM(n) { return n ? `$${(Number(n) / 1e6).toFixed(1)}M` : '—' }

function dealLabel(type) {
  const map = {
    VACANT: 'Vacant Land', TEARDOWN: 'Teardown', GARAGE: 'Garage / Parking',
    CONVERSION: 'Conversion', COMMERCIAL: 'Commercial', COOP: 'Co-op', CONDO: 'Condo',
  }
  return map[type] || type || '—'
}

function dealColor(type) {
  const map = {
    VACANT: GREEN, TEARDOWN: ORANGE, GARAGE: AMBER,
    CONVERSION: [139, 92, 246], COMMERCIAL: [6, 182, 212],
    COOP: RED, CONDO: RED,
  }
  return map[type] || DIM_GREY
}

function scoreColor(s) {
  if (s >= 80) return RED
  if (s >= 60) return ORANGE
  if (s >= 40) return AMBER
  return [234, 179,   8]
}

function formatBBL(bbl) {
  const s = String(Math.round(Number(bbl))).padStart(10, '0')
  return `${s[0]}-${s.slice(1,6)}-${s.slice(6)}`
}

export function exportSavedToPdf(savedProperties, assumptions = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const PW = doc.internal.pageSize.getWidth()
  const PH = doc.internal.pageSize.getHeight()

  const drawHeader = (pageNum, totalPages) => {
    // Dark header bar
    doc.setFillColor(...DARK_NAVY)
    doc.rect(0, 0, PW, 48, 'F')

    // Amber accent stripe
    doc.setFillColor(...AMBER)
    doc.rect(0, 48, PW, 3, 'F')

    // Logo
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(...AMBER)
    doc.text('PARCEL', 36, 31)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...DIM_GREY)
    doc.text('NYC', 90, 31)

    // Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...WHITE)
    doc.text('Saved Properties — Deal Pipeline', PW / 2, 28, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...DIM_GREY)
    doc.text('Manhattan Development Intelligence', PW / 2, 40, { align: 'center' })

    // Date + page
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...DIM_GREY)
    doc.text(`Generated ${dateStr}`, PW - 36, 26, { align: 'right' })
    doc.text(`Page ${pageNum} of ${totalPages}`, PW - 36, 38, { align: 'right' })
  }

  const drawFooter = () => {
    doc.setFillColor(...MID_NAVY)
    doc.rect(0, PH - 24, PW, 24, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...DIM_GREY)
    doc.text(
      'PARCEL · Data sourced from NYC PLUTO, ACRIS & Department of Finance · For informational purposes only',
      PW / 2, PH - 9, { align: 'center' }
    )
  }

  // Build rows
  const rows = savedProperties.map(p => {
    const lotSF      = Number(p.lotarea  || 0)
    const buildableSF = Number(p.available_far || 0) * lotSF
    return {
      address:    p.address   || formatBBL(p.bbl),
      bbl:        formatBBL(p.bbl),
      deal_type:  p.deal_type || '—',
      score:      p.score     || 0,
      zone:       p.zonedist1 || '—',
      lot_sf:     lotSF,
      buildable_sf: buildableSF,
      neighborhood: p.neighborhood || p.boroct2020 || '—',
      year_built:  p.yearbuilt  || '—',
      floors:      p.numfloors  || '—',
      units:       p.unitsres   || '—',
    }
  })

  // Summary stats
  const totalBuildable = rows.reduce((s, r) => s + r.buildable_sf, 0)
  const avgScore = rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0

  // ── Page 1: table ─────────────────────────────────────────────────────────
  const tableTop = 68

  autoTable(doc, {
    startY: tableTop,
    margin: { left: 36, right: 36, bottom: 36 },
    head: [[
      'Address', 'BBL', 'Deal Type', 'Score',
      'Zone', 'Lot SF', 'Buildable SF', 'Nbhd / Block',
      'Built', 'Flrs', 'Units',
    ]],
    body: rows.map(r => [
      r.address,
      r.bbl,
      dealLabel(r.deal_type),
      r.score,
      r.zone,
      fmt(r.lot_sf),
      r.buildable_sf > 0 ? fmt(Math.round(r.buildable_sf)) : '—',
      r.neighborhood,
      r.year_built,
      r.floors,
      r.units,
    ]),
    theme: 'plain',
    headStyles: {
      fillColor:  MID_NAVY,
      textColor:  LIGHT_GREY,
      fontStyle:  'bold',
      fontSize:   7.5,
      cellPadding: { top: 5, bottom: 5, left: 5, right: 5 },
    },
    bodyStyles: {
      fillColor:  DARK_NAVY,
      textColor:  LIGHT_GREY,
      fontSize:   8,
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
    },
    alternateRowStyles: {
      fillColor: [11, 17, 33],
    },
    columnStyles: {
      0: { cellWidth: 130, fontStyle: 'bold', textColor: WHITE },
      1: { cellWidth:  78, textColor: DIM_GREY, fontSize: 7 },
      2: { cellWidth:  66 },
      3: { cellWidth:  36, halign: 'center' },
      4: { cellWidth:  44, halign: 'center' },
      5: { cellWidth:  50, halign: 'right' },
      6: { cellWidth:  68, halign: 'right', fontStyle: 'bold', textColor: AMBER },
      7: { cellWidth:  74 },
      8: { cellWidth:  36, halign: 'center' },
      9: { cellWidth:  26, halign: 'center' },
      10:{ cellWidth:  30, halign: 'center' },
    },
    // Colour code Deal Type and Score cells per row
    didParseCell(data) {
      if (data.section === 'body') {
        const row = rows[data.row.index]
        if (data.column.index === 2) {
          data.cell.styles.textColor = dealColor(row.deal_type)
        }
        if (data.column.index === 3) {
          data.cell.styles.textColor = scoreColor(row.score)
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
    didDrawPage(hookData) {
      const pageNum  = doc.internal.getNumberOfPages()
      // We'll fix total after; for now write placeholder
      drawHeader(pageNum, '?')
      drawFooter()
    },
  })

  // ── Summary box (after table on last page) ─────────────────────────────────
  const finalY = doc.lastAutoTable.finalY + 16
  const boxH   = 56
  if (finalY + boxH < PH - 40) {
    doc.setFillColor(...MID_NAVY)
    doc.roundedRect(36, finalY, PW - 72, boxH, 4, 4, 'F')

    const cols = [
      { label: 'Properties Saved', val: String(rows.length) },
      { label: 'Total Buildable SF', val: totalBuildable > 0 ? fmt(Math.round(totalBuildable)) : '—' },
      { label: 'Avg Opportunity Score', val: String(avgScore) },
      { label: 'Exported', val: new Date().toLocaleDateString('en-US') },
    ]
    const colW = (PW - 72) / cols.length
    cols.forEach((c, i) => {
      const cx = 36 + colW * i + colW / 2
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(15)
      doc.setTextColor(...AMBER)
      doc.text(c.val, cx, finalY + 22, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...DIM_GREY)
      doc.text(c.label.toUpperCase(), cx, finalY + 38, { align: 'center' })
    })
  }

  // Fix page numbers now that we know total
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    // Re-draw header with correct total
    drawHeader(i, totalPages)
    drawFooter()
  }

  const date = new Date().toISOString().slice(0, 10)
  doc.save(`PARCEL_pipeline_${date}.pdf`)
}
