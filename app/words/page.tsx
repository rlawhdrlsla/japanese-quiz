'use client';

import { useEffect, useState, useCallback } from 'react';
import { Word } from '@/lib/types';

interface WordFormData {
  japanese: string;
  korean: string;
  reading: string;
  category: string;
}

const EMPTY_FORM: WordFormData = { japanese: '', korean: '', reading: '', category: '기본' };

export default function WordsPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<WordFormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchWords = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedCategory !== '전체') params.set('category', selectedCategory);
    if (search) params.set('search', search);
    const res = await fetch(`/api/words?${params}`);
    const data = await res.json();
    setWords(data.words ?? []);
    setCategories(data.categories ?? []);
    setLoading(false);
  }, [selectedCategory, search]);

  useEffect(() => { fetchWords(); }, [fetchWords]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const url = editingId ? `/api/words/${editingId}` : '/api/words';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
      fetchWords();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/words/${id}`, { method: 'DELETE' });
    setDeleteConfirm(null);
    fetchWords();
  }

  async function handleBulkImport() {
    const lines = bulkText.trim().split('\n').filter(l => l.trim());
    setSaving(true);
    let successCount = 0;
    for (const line of lines) {
      const parts = line.split(/[,\t]/).map(s => s.trim());
      if (parts.length < 2) continue;
      const [japanese, korean, reading = '', category = form.category] = parts;
      if (!japanese || !korean) continue;
      const res = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ japanese, korean, reading, category }),
      });
      if (res.ok) successCount++;
    }
    setSaving(false);
    setBulkText('');
    setShowBulk(false);
    fetchWords();
    alert(`${successCount}개 단어를 추가했습니다.`);
  }

  function startEdit(word: Word) {
    setForm({ japanese: word.japanese, korean: word.korean, reading: word.reading, category: word.category });
    setEditingId(word.id);
    setShowForm(true);
    setShowBulk(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setError('');
  }

  const accuracyOf = (w: Word) =>
    w.total_attempts > 0 ? Math.round((w.total_correct / w.total_attempts) * 100) : null;

  const inputClass = "w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-pink-500";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">단어장</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowBulk(!showBulk); setShowForm(false); cancelEdit(); }}
            className={`text-sm px-3 py-2 rounded-lg border transition-colors ${
              showBulk
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
            }`}
          >
            일괄 추가
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowBulk(false); if (showForm) cancelEdit(); }}
            className="text-sm px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-400 text-white font-medium transition-colors"
          >
            {showForm && !editingId ? '닫기' : '+ 추가'}
          </button>
        </div>
      </div>

      {/* Single Word Form */}
      {showForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-4 text-sm">
            {editingId ? '단어 수정' : '새 단어 추가'}
          </h2>
          {error && <p className="text-rose-400 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">일본어 *</label>
                <input
                  type="text"
                  value={form.japanese}
                  onChange={e => setForm(f => ({ ...f, japanese: e.target.value }))}
                  placeholder="食べる"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">한국어 *</label>
                <input
                  type="text"
                  value={form.korean}
                  onChange={e => setForm(f => ({ ...f, korean: e.target.value }))}
                  placeholder="먹다"
                  className={inputClass}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">읽는 법</label>
                <input
                  type="text"
                  value={form.reading}
                  onChange={e => setForm(f => ({ ...f, reading: e.target.value }))}
                  placeholder="たべる"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">카테고리</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="기본"
                  list="categories-list"
                  className={inputClass}
                />
                <datalist id="categories-list">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-pink-500 hover:bg-pink-400 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {saving ? '저장 중...' : editingId ? '수정 완료' : '추가하기'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk Import */}
      {showBulk && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-1 text-sm">일괄 단어 추가</h2>
          <p className="text-xs text-slate-500 mb-3">
            한 줄에 하나씩: <code className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">일본어,한국어</code> 또는 <code className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">일본어,한국어,읽는법,카테고리</code>
          </p>
          <div className="mb-3">
            <label className="text-xs text-slate-500 mb-1.5 block">기본 카테고리</label>
            <input
              type="text"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              placeholder="기본"
              className={`${inputClass} w-40`}
            />
          </div>
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            rows={7}
            placeholder={"食べる,먹다\n飲む,마시다,のむ,동사\n学校,학교"}
            className={`${inputClass} font-mono leading-relaxed`}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleBulkImport}
              disabled={saving || !bulkText.trim()}
              className="flex-1 bg-pink-500 hover:bg-pink-400 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? '추가 중...' : '일괄 추가'}
            </button>
            <button
              onClick={() => { setShowBulk(false); setBulkText(''); }}
              className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-300"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-2">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="단어 검색..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600"
        />
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white"
        >
          <option value="전체">전체</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <p className="text-xs text-slate-600">{words.length}개 단어</p>

      {/* Word List */}
      {loading ? (
        <div className="text-center py-12 text-slate-600 text-sm">불러오는 중...</div>
      ) : words.length === 0 ? (
        <div className="text-center py-12 text-slate-600">
          <p className="text-sm">단어가 없습니다</p>
          <p className="text-xs mt-1 text-slate-700">위에서 단어를 추가해보세요</p>
        </div>
      ) : (
        <div className="space-y-2">
          {words.map(word => {
            const acc = accuracyOf(word);
            return (
              <div
                key={word.id}
                className="bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3.5 flex items-center gap-3 hover:border-slate-600 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-white">{word.japanese}</span>
                    {word.reading && (
                      <span className="text-xs text-slate-500">({word.reading})</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-400 mt-0.5">{word.korean}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded-md">
                      {word.category}
                    </span>
                    {acc !== null && (
                      <span className={`text-xs font-medium ${
                        acc >= 70 ? 'text-emerald-400' :
                        acc >= 40 ? 'text-amber-400' :
                        'text-rose-400'
                      }`}>{acc}%</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(word)}
                    className="p-2 text-slate-600 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                    </svg>
                  </button>
                  {deleteConfirm === word.id ? (
                    <div className="flex gap-1 items-center">
                      <button
                        onClick={() => handleDelete(word.id)}
                        className="px-2.5 py-1.5 text-xs bg-rose-500 text-white rounded-lg hover:bg-rose-400 transition-colors"
                      >
                        삭제
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2.5 py-1.5 text-xs bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(word.id)}
                      className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
