import { useState } from 'react';
import { Printer } from 'lucide-react';
import logoWordmark from '@/assets/logo-wordmark.svg';

const CREAM = '#F2EDE8';
const NAVY = '#3B4A5A';
const FLAME = '#C45C2E';

interface IntakeSection {
  num: string;
  title: string;
  fields: { label: string; value: string }[];
}

interface IntakeFormData {
  type: 'intake_form';
  memberId: string;
  memberName: string;
  submittedDate: string;
  sections: IntakeSection[];
}

export function isIntakeFormMessage(content: string): IntakeFormData | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === 'intake_form') return parsed as IntakeFormData;
  } catch {}
  return null;
}

export function IntakeFormMessage({ data }: { data: IntakeFormData }) {
  const [showPrint, setShowPrint] = useState(false);

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setShowPrint(false), 500);
    }, 100);
  };

  return (
    <>
      <div className="max-w-[95%] rounded-xl overflow-hidden" style={{ background: CREAM, border: `1px solid ${NAVY}20` }}>
        {/* Header bar */}
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: NAVY }}>
          <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: CREAM, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}>
            📋 Client Intake Form
          </span>
          <span className="text-[10px] opacity-70" style={{ color: CREAM }}>{data.memberName}</span>
        </div>

        {/* Sections */}
        <div className="px-4 py-3 space-y-3">
          {data.sections.map(section => (
            <div key={section.num}>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-[11px] font-bold" style={{ color: FLAME, fontFamily: "'Bebas Neue', sans-serif" }}>{section.num}</span>
                <span className="text-sm font-semibold" style={{ color: NAVY, fontFamily: "'Cormorant Garamond', serif" }}>{section.title}</span>
              </div>
              <div className="pl-5 space-y-0.5">
                {section.fields.map((f, i) => (
                  <p key={i} className="text-xs" style={{ color: NAVY }}>
                    <span className="font-medium opacity-60">{f.label}:</span>{' '}
                    <span>{f.value}</span>
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 flex items-center justify-between border-t" style={{ borderColor: `${NAVY}15` }}>
          <span className="text-[10px] opacity-50" style={{ color: NAVY }}>Submitted on {data.submittedDate}</span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold tracking-wider uppercase transition-colors hover:opacity-80"
            style={{ borderColor: NAVY, color: NAVY, fontFamily: "'Bebas Neue', sans-serif", fontSize: '11px', letterSpacing: '0.06em' }}
          >
            <Printer className="w-3 h-3" />
            Print Intake Form
          </button>
        </div>
      </div>

      {/* Print overlay */}
      {showPrint && <IntakeFormPrintView data={data} />}
    </>
  );
}

function IntakeFormPrintView({ data }: { data: IntakeFormData }) {
  return (
    <div className="fixed inset-0 z-[9999] overflow-auto" style={{ background: CREAM }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Bebas+Neue&family=Montserrat:wght@300;400;500;600&display=swap');
        @media print {
          body > *:not(.intake-print-overlay) { display: none !important; }
          .intake-print-overlay { position: static !important; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="intake-print-overlay" style={{ fontFamily: "'Montserrat', sans-serif", color: NAVY }}>
        {/* Header */}
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src={logoWordmark} alt="Soul Fuel Society" className="h-8" />
          <div className="text-right">
            <p className="text-xs font-semibold tracking-wider uppercase" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '14px', letterSpacing: '0.1em' }}>Client Intake Form</p>
            <p className="text-[10px] tracking-wider uppercase opacity-60" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>Personal Training · Confidential</p>
          </div>
        </div>
        <div className="h-1 max-w-4xl mx-auto" style={{ background: `linear-gradient(to right, ${NAVY}, ${NAVY}80, transparent)` }} />

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          <div className="text-sm font-medium" style={{ color: NAVY }}>
            Client: <span className="font-bold">{data.memberName}</span>
          </div>

          {data.sections.map(section => (
            <div key={section.num}>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-sm font-bold tracking-wider" style={{ color: FLAME, fontFamily: "'Bebas Neue', sans-serif" }}>{section.num}</span>
                <h2 className="text-xl font-light tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif", color: NAVY }}>{section.title}</h2>
              </div>
              <div className="pl-7 space-y-1 mb-4">
                {section.fields.map((f, i) => (
                  <p key={i} className="text-sm" style={{ color: NAVY }}>
                    <span className="font-medium opacity-60">{f.label}:</span>{' '}
                    <span>{f.value}</span>
                  </p>
                ))}
              </div>
              <div className="h-px" style={{ background: `${NAVY}15` }} />
            </div>
          ))}

          <div className="text-xs opacity-50 pt-4">Submitted on {data.submittedDate}</div>
        </div>
      </div>
    </div>
  );
}
