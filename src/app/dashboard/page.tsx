"use client";
import { useEffect, useMemo, useState } from "react";

type Row = {
  order_date?: string;
  sku?: string;
  asin?: string;
  marketplace?: string;
  qty?: number;
  revenue?: number;
};

export default function Dashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [sku, setSku] = useState("");
  const [asin, setAsin] = useState("");
  const [marketplace, setMarketplace] = useState("");
  const [sortKey, setSortKey] = useState<keyof Row | "">("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    const p = new URLSearchParams();
    if (sku) p.set("sku", sku);
    if (asin) p.set("asin", asin);
    if (marketplace) p.set("marketplace", marketplace);
    const r = await fetch(`/api/sl/monthly?${p.toString()}`);
    if (!r.ok) {
      setError(await r.text());
      setRows([]);
      setLoading(false);
      return;
    }
    const j = await r.json();
    setRows(j.rows ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    const data = [...rows];
    if (sortKey) {
      data.sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        return (av < bv ? -1 : av > bv ? 1 : 0) * (sortDir === "asc" ? 1 : -1);
      });
    }
    return data;
  }, [rows, sortKey, sortDir]);

  const setSort = (k: keyof Row) => {
    if (sortKey === k) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Current Month — SellerLegend</h1>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm">SKU</label>
          <input className="border rounded px-2 py-1" value={sku} onChange={(e) => setSku(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">ASIN</label>
          <input className="border rounded px-2 py-1" value={asin} onChange={(e) => setAsin(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Marketplace</label>
          <input className="border rounded px-2 py-1" value={marketplace} onChange={(e) => setMarketplace(e.target.value)} />
        </div>
        <button onClick={fetchData} className="border rounded px-3 py-2">
          {loading ? "Loading…" : "Apply filters"}
        </button>
      </div>

      {error && <pre className="text-red-600 whitespace-pre-wrap">{error}</pre>}

      <div className="overflow-auto border rounded">
        <table className="min-w-[800px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left cursor-pointer" onClick={() => setSort("order_date")}>Date</th>
              <th className="p-2 text-left cursor-pointer" onClick={() => setSort("sku")}>SKU</th>
              <th className="p-2 text-left cursor-pointer" onClick={() => setSort("asin")}>ASIN</th>
              <th className="p-2 text-left cursor-pointer" onClick={() => setSort("marketplace")}>Marketplace</th>
              <th className="p-2 text-right cursor-pointer" onClick={() => setSort("qty")}>Qty</th>
              <th className="p-2 text-right cursor-pointer" onClick={() => setSort("revenue")}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i} className="odd:bg-white even:bg-gray-50">
                <td className="p-2">{r.order_date?.slice(0, 10)}</td>
                <td className="p-2">{r.sku}</td>
                <td className="p-2">{r.asin}</td>
                <td className="p-2">{r.marketplace}</td>
                <td className="p-2 text-right">{r.qty ?? ""}</td>
                <td className="p-2 text-right">
                  {typeof r.revenue === "number" ? r.revenue.toFixed(2) : r.revenue ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

