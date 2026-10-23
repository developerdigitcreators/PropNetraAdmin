# -*- coding: utf-8 -*-
"""Retrofit Phase C admin list pages to shared table components."""
from pathlib import Path

ROOT = Path(r"c:\rn\propnetra-admin\src")

# ---- FAQs ----
faqs = ROOT / r"app\(dashboard)\faqs\page.tsx"
text = faqs.read_text(encoding="utf-8")
text = text.replace(
    """import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
""",
    """import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { useClientPagedRows } from '@/hooks/use-client-paged-rows';
import { Button } from '@/components/ui/button';
""",
)
text = text.replace(
    """  CircleHelp,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
""",
    """  Edit2,
  Plus,
  Trash2,
} from 'lucide-react';
""",
)

old_hook = """  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const openCreate = () => {
"""
new_hook = """  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const {
    page,
    limit,
    total,
    totalPages,
    pageRows,
    onPageChange,
    onPageSizeChange,
  } = useClientPagedRows(faqs);

  const handleReorderPaged = async (ordered: Array<FaqItem & { sortOrder: number }>) => {
    const previous = faqs;
    const start = (page - 1) * limit;
    const merged = [...faqs];
    merged.splice(start, ordered.length, ...ordered);
    setFaqs(merged);
    try {
      await faqsService.reorder(merged.map((item) => item.id));
    } catch (err) {
      setFaqs(previous);
      setError(faqApiError(err, 'Failed to reorder FAQs.'));
    }
  };

  const openCreate = () => {
"""
if old_hook not in text:
    raise SystemExit("faqs hook marker missing")
text = text.replace(old_hook, new_hook)

# Replace handleReorder body usage - keep original handleReorder but use handleReorderPaged in table
# Actually we duplicated - remove old handleReorder and use new one. Simpler: rename in SortableTableBody call.

old_ui = """          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void fetchFaqs()}
              disabled={loading}
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              Refresh
            </Button>
            {canCreate && (
              <Button onClick={openCreate} className="bg-primary text-white hover:bg-primary/90">
                <Plus className="mr-1.5 h-4 w-4" />
                Add FAQ
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/80">
                <tr>
                  <th className="px-5 py-3 font-semibold text-gray-700">Question</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Answer</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Sort</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              {loading ? (
                <tbody>
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    </td>
                  </tr>
                </tbody>
              ) : faqs.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                      <CircleHelp className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                      No FAQs yet. Add the first question for the app.
                    </td>
                  </tr>
                </tbody>
              ) : (
                <SortableTableBody
                  items={faqs}
                  disabled={!canUpdate}
                  onReorder={handleReorder}
"""

new_ui = """          <AdminListToolbar
            onRefresh={() => void fetchFaqs()}
            refreshBusy={loading}
          >
            {canCreate ? (
              <Button
                type="button"
                size="sm"
                onClick={openCreate}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Plus className="mr-1.5 size-3.5" />
                Add FAQ
              </Button>
            ) : null}
          </AdminListToolbar>
        </div>

        <AdminDataTable
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          loading={loading}
          error={error || null}
          isEmpty={!faqs.length}
          emptyMessage="No FAQs yet. Add the first question for the app."
          syncKey={pageRows.length}
        >
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/80">
                <tr>
                  <th className="px-5 py-3 font-semibold text-gray-700">Question</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Answer</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Sort</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
                <SortableTableBody
                  items={pageRows}
                  disabled={!canUpdate}
                  onReorder={handleReorderPaged}
"""
if old_ui not in text:
    raise SystemExit("faqs ui marker missing")
text = text.replace(old_ui, new_ui)

old_end = """                />
              )}
            </table>
          </div>
        </div>
      </div>

      <FaqFormDialog
"""
new_end = """                />
            </table>
        </AdminDataTable>
      </div>

      <FaqFormDialog
"""
if old_end not in text:
    raise SystemExit("faqs end marker missing")
text = text.replace(old_end, new_end)
faqs.write_text(text, encoding="utf-8")
print("faqs ok")
