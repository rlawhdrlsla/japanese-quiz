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
      // Support: "일본어,한국어" or "일본어 한국어" or "일본어\t한국어"
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">📖 단어장</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowBulk(!showBulk); setShowForm(false); cancelEdit(); }}
            className="text-sm px-3 py-2 rounded-lg border border-pink-300 text-pink-600 hover:bg-pink-50"
          >
            일괄 추가
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowBulk(false); if (showForm) cancelEdit(); }}
            className="text-sm px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600"
          >
            {showForm && !editingId ? '닫기' : '+ 단어 추가'}
          </button>
        </div>
      </div>

      {/* Single Word Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100">
          <h2 className="font-bold text-gray-700 mb-4">{editingId ? '단어 수정' : '새 단어 추가'}</h2>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">일본어 *</label>
                <input
                  type="text"
                  value={form.japanese}
                  onChange={e => setForm(f => ({ ...f, japanese: e.target.value }))}
                  placeholder="例: 食べる"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-pink-400"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">한국어 *</label>
                <input
                  type="text"
                  value={form.korean}
                  onChange={e => setForm(f => ({ ...f, korean: e.target.value }))}
                  placeholder="예: 먹다"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-pink-400"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">읽는 법 (선택)</label>
                <input
                  type="text"
                  value={form.reading}
                  onChange={e => setForm(f => ({ ...f, reading: e.target.value }))}
                  placeholder="たべる"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-pink-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">카테고리</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="기본"
                  list="categories-list"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-pink-400"
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
                className="flex-1 bg-pink-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-pink-600 disabled:opacity-50"
              >
                {saving ? '저장 중...' : editingId ? '수정 완료' : '추가하기'}
              </button>
              <button type="button" onClick={cancelEdit} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk Import */}
      {showBulk && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100">
          <h2 className="font-bold text-gray-700 mb-2">일괄 단어 추가</h2>
          <p className="text-xs text-gray-400 mb-3">
            한 줄에 하나씩 입력: <code className="bg-gray-100 px-1 rounded">일본어,한국어</code> 또는 <code className="bg-gray-100 px-1 rounded">일본어,한국어,읽는법,카테고리</code>
          </p>
          <div className="mb-2">
            <label className="text-xs text-gray-500 mb-1 block">기본 카테고리</label>
            <input
              type="text"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              placeholder="기본"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-48 focus:border-pink-400"
            />
          </div>
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            rows={8}
            placeholder={"食べる,먹다\n飲む,마시다,のむ,동사\n学校,학교"}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:border-pink-400"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleBulkImport}
              disabled={saving || !bulkText.trim()}
              className="flex-1 bg-pink-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-pink-600 disabled:opacity-50"
            >
              {saving ? '추가 중...' : '일괄 추가'}
            </button>
            <button onClick={() => { setShowBulk(false); setBulkText(''); }} className="px-4 py-2 text-sm text-gray-500">
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
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-pink-400"
        />
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-pink-400"
        >
          <option value="전체">전체</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Word Count */}
      <p className="text-sm text-gray-400">{words.length}개 단어</p>

      {/* Word List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : words.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>단어가 없습니다.</p>
          <p className="text-sm mt-1">위에서 단어를 추가해보세요!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {words.map(word => {
            const acc = accuracyOf(word);
            return (
              <div
                key={word.id}
                className="bg-white rounded-xl px-4 py-3 shadow-sm border border-pink-50 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-gray-800">{word.japanese}</span>
                    {word.reading && (
                      <span className="text-xs text-gray-400">({word.reading})</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">{word.korean}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">{word.category}</span>
                    {acc !== null && (
                      <span className={`text-xs font-medium ${
                        acc >= 70 ? 'text-emerald-600' : acc >= 40 ? 'text-orange-500' : 'text-red-500'
                      }`}>{acc}%</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(word)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="수정"
                  >
                    ✏️
                  </button>
                  {deleteConfirm === word.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(word.id)}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg"
                      >
                        삭제
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-lg"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(word.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="삭제"
                    >
                      🗑️
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
