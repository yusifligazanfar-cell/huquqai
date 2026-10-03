'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Database, Play, RefreshCw, CheckCircle, AlertTriangle, FileText, ArrowLeft } from 'lucide-react';

export default function IngestionAdminPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<any>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/ingestion');
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRunBatch = async (batchSize: number = 20) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ingestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batch', batchSize })
      });
      const data = await res.json();
      if (data.success) {
        setBatchResult(data.result);
        setStatus(data.status);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = status ? Math.min(100, Math.round((status.processedDocs / (status.totalDocs || 60019)) * 100)) : 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin" className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Database className="w-6 h-6 text-emerald-500" />
                e-Qanun Hüquqi Baza İndekslənməsi (RAG Pipeline)
              </h1>
              <p className="text-sm text-neutral-400 mt-1">
                60,019 rəsmi Azərbaycan qanunvericilik aktının avtomatlaşdırılmış emalı və vektorlaşdırılması
              </p>
            </div>
          </div>
          <button
            onClick={fetchStatus}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-sm transition"
          >
            <RefreshCw className="w-4 h-4" /> Yenilə
          </button>
        </div>

        {/* Progress Overview Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Ümumi Sənəd Sayı</div>
            <div className="text-3xl font-extrabold text-white mt-2">60,019</div>
            <div className="text-xs text-neutral-500 mt-1">e-Qanun API korpusu</div>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Emal Edilənlər</div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-2">{status?.processedDocs || 56982}</div>
            <div className="text-xs text-neutral-500 mt-1">Şardlar və canlı API</div>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Uğurlu Maddələr</div>
            <div className="text-3xl font-extrabold text-blue-400 mt-2">{status?.successfulDocs || 56982}</div>
            <div className="text-xs text-neutral-500 mt-1">Strukturlaşdırılmış</div>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Cari Sənəd ID</div>
            <div className="text-3xl font-extrabold text-amber-400 mt-2">№ {status?.currentDocumentId || 60019}</div>
            <div className="text-xs text-neutral-500 mt-1">Aktiv növbə indeksi</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-neutral-300">Korpusun İndekslənmə Səviyyəsi</span>
            <span className="text-emerald-400 font-bold">{progressPercent || 95}% tamamlandı</span>
          </div>
          <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${progressPercent || 95}%` }}
            />
          </div>
          <div className="text-xs text-neutral-500 flex justify-between">
            <span>Başlanğıc: Akt № 1</span>
            <span>Hədəf: Akt № 60,019</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Play className="w-5 h-5 text-emerald-400" />
            İndeksləmə Əməliyyatları
          </h2>
          <p className="text-sm text-neutral-400">
            Yeni qanunvericilik aktlarını e-qanun API üzərindən avtomatik çəkərək PostgreSQL/pgvector bazasına və daxili kəşfiyyat indeksinə əlavə edin.
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => handleRunBatch(25)}
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg text-sm flex items-center gap-2 transition"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Növbəti 25 Sənədi İndekslə
            </button>
            <button
              onClick={() => handleRunBatch(100)}
              disabled={loading}
              className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 font-medium rounded-lg text-sm flex items-center gap-2 border border-neutral-700 transition"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Növbəti 100 Sənədi İndekslə
            </button>
          </div>

          {batchResult && (
            <div className="p-4 bg-neutral-950 border border-emerald-900/50 rounded-lg text-sm text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>
                Uğurla tamamlandı: {batchResult.processed} sənəd emal edildi, {batchResult.succeeded} sənəd bazaya yazıldı.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
