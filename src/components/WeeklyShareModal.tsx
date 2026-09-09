import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDateHuman } from '../lib/dateUtils';
import { X, Share2, Copy, Check, MessageSquare } from 'lucide-react';

interface WeeklyShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WeeklyShareModal: React.FC<WeeklyShareModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentWeekShifts, currentWeekSummary, selectedWeek, settings } = useApp();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Build formatted text message for WhatsApp or copy
  const lines: string[] = [];
  lines.push(`👶 *NannyPay - Resumen de Pago Semanal*`);
  lines.push(`*Niñera:* ${settings.nannyName}`);
  lines.push(`*Período:* ${selectedWeek.label}`);
  lines.push(`---------------------------------`);

  if (currentWeekShifts.length === 0) {
    lines.push(`No hay días registrados en esta semana.`);
  } else {
    currentWeekShifts.forEach((shift) => {
      const { dayName, formattedDate } = formatDateHuman(shift.date);
      const breakText = shift.breakMinutes && shift.breakMinutes > 0 ? ` (-${shift.breakMinutes}m)` : '';
      const notesText = shift.notes ? ` [${shift.notes}]` : '';
      lines.push(
        `• *${dayName} ${formattedDate}:* ${shift.startTime} - ${shift.endTime}${breakText} | ${shift.hoursWorked}h @ ${settings.currency}${shift.hourlyRate}/h = *${formatCurrency(shift.totalAmount, settings.currency)}*${notesText}`
      );
    });
  }

  lines.push(`---------------------------------`);
  lines.push(`⏱️ *Total Horas Trabajadas:* ${currentWeekSummary.totalHours} hrs`);
  lines.push(`💰 *Total a Depositar:* ${formatCurrency(currentWeekSummary.totalAmount, settings.currency)}`);
  
  if (currentWeekSummary.pendingAmount > 0) {
    lines.push(`⏳ *Por Depositar:* ${formatCurrency(currentWeekSummary.pendingAmount, settings.currency)}`);
  }
  if (currentWeekSummary.paidAmount > 0) {
    lines.push(`✅ *Ya Depositado:* ${formatCurrency(currentWeekSummary.paidAmount, settings.currency)}`);
  }

  lines.push(`\n_Generado automáticamente con NannyPay_`);

  const shareText = lines.join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Resumen Semanal de Pago
              </h3>
              <p className="text-xs text-stone-500">
                Comparte el desglose de horas y depósito con {settings.nannyName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 font-mono text-xs text-stone-800 whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed select-all">
            {shareText}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Enviar por WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Texto</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
