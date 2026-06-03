"use client";

import { useState, useMemo } from "react";
import { Btn } from "@/components/ui/Btn";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";

type Category = "Electrical" | "Plumbing" | "HVAC" | "Painting" | "General";
type Unit = "per job" | "per hour" | "per unit" | "per sq ft" | "per day";

interface PriceItem {
  id: string;
  description: string;
  category: Category;
  unit: Unit;
  price: number;
}

const CATEGORY_COLORS: Record<Category, string> = {
  Electrical: "#6b4a8a",
  Plumbing:   "#4a6a8a",
  HVAC:       "#4a8a6a",
  Painting:   "#8a5a4a",
  General:    "#6b6860",
};

const CATEGORIES: Category[] = ["Electrical", "Plumbing", "HVAC", "Painting", "General"];
const UNITS: Unit[] = ["per job", "per hour", "per unit", "per sq ft", "per day"];

const INITIAL_ITEMS: PriceItem[] = [
  { id: "p1",  description: "HVAC filter replacement",               category: "HVAC",       unit: "per job",  price: 180  },
  { id: "p2",  description: "Electrical troubleshooting & diagnosis", category: "Electrical", unit: "per hour", price: 95   },
  { id: "p3",  description: "Plumbing drain clearing",               category: "Plumbing",   unit: "per job",  price: 350  },
  { id: "p4",  description: "Interior wall painting",                category: "Painting",   unit: "per sq ft",price: 3    },
  { id: "p5",  description: "HVAC full system tune-up",              category: "HVAC",       unit: "per job",  price: 425  },
  { id: "p6",  description: "GFCI outlet installation",              category: "Electrical", unit: "per unit", price: 145  },
  { id: "p7",  description: "Toilet repair or replacement",          category: "Plumbing",   unit: "per job",  price: 275  },
  { id: "p8",  description: "General handyman (misc repairs)",       category: "General",    unit: "per hour", price: 75   },
  { id: "p9",  description: "Ceiling fan installation",              category: "Electrical", unit: "per unit", price: 165  },
  { id: "p10", description: "Exterior trim painting",                category: "Painting",   unit: "per day",  price: 650  },
];

function fmt$(n: number, unit: Unit): string {
  const price = unit === "per sq ft"
    ? "$" + n.toFixed(2)
    : "$" + n.toLocaleString("en-US");
  return price;
}

function CategoryBadge({ category }: { category: Category }) {
  const color = CATEGORY_COLORS[category];
  return (
    <span style={{
      display: "inline-block",
      fontSize: 10.5,
      fontWeight: 500,
      padding: "2px 8px",
      borderRadius: 999,
      background: color + "18",
      color: color,
      whiteSpace: "nowrap",
    }}>
      {category}
    </span>
  );
}

interface EditFormProps {
  initial: Partial<PriceItem>;
  onSave: (data: { description: string; category: Category; unit: Unit; price: number }) => void;
  onCancel: () => void;
  isNew?: boolean;
}

function ItemForm({ initial, onSave, onCancel, isNew }: EditFormProps) {
  const [desc, setDesc] = useState(initial.description ?? "");
  const [cat, setCat] = useState<Category>(initial.category ?? "General");
  const [unit, setUnit] = useState<Unit>(initial.unit ?? "per job");
  const [price, setPrice] = useState(initial.price !== undefined ? String(initial.price) : "");

  const valid = desc.trim().length > 0 && price.trim().length > 0 && !isNaN(Number(price));

  const inputStyle: React.CSSProperties = {
    height: 30,
    padding: "0 10px",
    border: "1px solid #dcd9d2",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "inherit",
    color: "#1a1814",
    background: "#fff",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
    appearance: "none" as const,
  };

  return (
    <div style={{
      background: "#fafaf8",
      border: "1px solid #ecebe6",
      borderRadius: 10,
      padding: "16px 18px",
      marginBottom: isNew ? 0 : 0,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1814", marginBottom: 12 }}>
        {isNew ? "Add new item" : "Edit item"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 130px 100px", gap: 10, alignItems: "end" }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#6b6860", marginBottom: 4, letterSpacing: "0.03em", textTransform: "uppercase" }}>
            Description
          </label>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="e.g. HVAC filter replacement"
            style={inputStyle}
            autoFocus
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#6b6860", marginBottom: 4, letterSpacing: "0.03em", textTransform: "uppercase" }}>
            Category
          </label>
          <select value={cat} onChange={(e) => setCat(e.target.value as Category)} style={selectStyle}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#6b6860", marginBottom: 4, letterSpacing: "0.03em", textTransform: "uppercase" }}>
            Unit
          </label>
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} style={selectStyle}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#6b6860", marginBottom: 4, letterSpacing: "0.03em", textTransform: "uppercase" }}>
            Price ($)
          </label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            type="number"
            min="0"
            step="0.01"
            style={inputStyle}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        <Btn variant="ghost" size="sm" onClick={onCancel}>Cancel</Btn>
        <Btn
          variant="primary"
          size="sm"
          disabled={!valid}
          onClick={() => {
            if (!valid) return;
            onSave({ description: desc.trim(), category: cat, unit, price: Number(price) });
          }}
        >
          {isNew ? "Add item" : "Save changes"}
        </Btn>
      </div>
    </div>
  );
}

export function PriceListScreen() {
  const [items, setItems] = useState<PriceItem[]>(INITIAL_ITEMS);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<"All" | Category>("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchCat = activeCategory === "All" || item.category === activeCategory;
      const q = search.toLowerCase();
      const matchSearch = !q || item.description.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [items, search, activeCategory]);

  const handleSaveEdit = (id: string, data: { description: string; category: Category; unit: Unit; price: number }) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, ...data } : item));
    setEditingId(null);
  };

  const handleAddItem = (data: { description: string; category: Category; unit: Unit; price: number }) => {
    const newItem: PriceItem = {
      id: "p" + Date.now(),
      ...data,
    };
    setItems((prev) => [newItem, ...prev]);
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setDeletingId(null);
  };

  const tabCategories: ("All" | Category)[] = ["All", ...CATEGORIES];

  return (
    <div style={{ padding: "24px 28px 36px", display: "flex", flexDirection: "column", gap: 18 }}>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "#1a1814", margin: 0, letterSpacing: "-0.01em" }}>
            Standard Price List
          </h1>
          <p style={{ fontSize: 13, color: "#6b6860", margin: "4px 0 0" }}>
            Manage standard rates for services across all properties
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" size="md" icon={<Icon.download />}>Export</Btn>
          <Btn
            variant="primary"
            size="md"
            icon={<Icon.plus />}
            onClick={() => { setShowAddForm(true); setEditingId(null); }}
          >
            Add item
          </Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <Card style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>Total items</div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "#1a1814", marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{items.length}</div>
          <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 3 }}>Across all categories</div>
        </Card>
        <Card style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>Avg rate/hr</div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "#1a1814", marginTop: 8, fontVariantNumeric: "tabular-nums" }}>
            ${Math.round(items.filter((i) => i.unit === "per hour").reduce((s, i) => s + i.price, 0) / Math.max(1, items.filter((i) => i.unit === "per hour").length))}
          </div>
          <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 3 }}>Hourly services</div>
        </Card>
        <Card style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>Avg job price</div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "#1a1814", marginTop: 8, fontVariantNumeric: "tabular-nums" }}>
            ${Math.round(items.filter((i) => i.unit === "per job").reduce((s, i) => s + i.price, 0) / Math.max(1, items.filter((i) => i.unit === "per job").length))}
          </div>
          <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 3 }}>Fixed-fee services</div>
        </Card>
        <Card style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>Last updated</div>
          <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: "#1a1814", marginTop: 8 }}>Jun 1</div>
          <div style={{ fontSize: 11.5, color: "#8a8780", marginTop: 3 }}>2025</div>
        </Card>
      </div>

      <Card pad={0}>
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220, display: "flex", alignItems: "center", gap: 7, background: "#f4f2ec", borderRadius: 8, padding: "0 10px", height: 32 }}>
            <Icon.search style={{ color: "#8a8780", flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services…"
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, fontFamily: "inherit", color: "#1a1814", width: "100%" }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#8a8780", padding: 0, display: "flex", alignItems: "center" }}
              >
                <Icon.x />
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {tabCategories.map((cat) => {
              const active = activeCategory === cat;
              const color = cat === "All" ? "#1a1814" : CATEGORY_COLORS[cat as Category];
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    height: 28,
                    padding: "0 12px",
                    borderRadius: 6,
                    border: active ? `1px solid ${color}30` : "1px solid transparent",
                    background: active ? (cat === "All" ? "#f4f2ec" : color + "18") : "transparent",
                    color: active ? (cat === "All" ? "#1a1814" : color) : "#6b6860",
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 120ms",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {showAddForm && (
          <>
            <Divider />
            <div style={{ padding: "16px 20px" }}>
              <ItemForm
                initial={{}}
                onSave={handleAddItem}
                onCancel={() => setShowAddForm(false)}
                isNew
              />
            </div>
          </>
        )}

        <Divider />

        <div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 120px 120px 100px 72px",
            gap: 12,
            padding: "9px 20px",
            background: "#fafaf8",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#8a8780", letterSpacing: "0.05em", textTransform: "uppercase" }}>Description</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#8a8780", letterSpacing: "0.05em", textTransform: "uppercase" }}>Category</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#8a8780", letterSpacing: "0.05em", textTransform: "uppercase" }}>Unit</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#8a8780", letterSpacing: "0.05em", textTransform: "uppercase", textAlign: "right" }}>Price</div>
            <div />
          </div>
          <Divider />

          {filtered.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#a8a49c", fontSize: 13 }}>
              No items match your search
            </div>
          )}

          {filtered.map((item, i) => {
            const isEditing = editingId === item.id;
            const isDeleting = deletingId === item.id;
            const dotColor = CATEGORY_COLORS[item.category];

            return (
              <div key={item.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f4f2ec" : "none" }}>
                {isEditing ? (
                  <div style={{ padding: "12px 20px" }}>
                    <ItemForm
                      initial={item}
                      onSave={(data) => handleSaveEdit(item.id, data)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : isDeleting ? (
                  <div style={{ padding: "12px 20px", background: "#fff8f6", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, fontSize: 13, color: "#1a1814" }}>
                      Delete <strong>{item.description}</strong>?
                    </div>
                    <Btn variant="ghost" size="sm" onClick={() => setDeletingId(null)}>Cancel</Btn>
                    <Btn variant="danger" size="sm" onClick={() => handleDelete(item.id)}>Delete</Btn>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 120px 100px 72px",
                      gap: 12,
                      padding: "12px 20px",
                      alignItems: "center",
                      transition: "background 100ms",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#fafaf8"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "#1a1814", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.description}
                      </span>
                    </div>
                    <div><CategoryBadge category={item.category} /></div>
                    <div style={{ fontSize: 12.5, color: "#6b6860" }}>{item.unit}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1814", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                      {fmt$(item.price, item.unit)}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                      <button
                        onClick={() => { setEditingId(item.id); setDeletingId(null); setShowAddForm(false); }}
                        title="Edit"
                        style={{
                          width: 28, height: 28, borderRadius: 6,
                          border: "1px solid transparent",
                          background: "transparent",
                          color: "#8a8780",
                          cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 120ms",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f4f2ec"; (e.currentTarget as HTMLElement).style.borderColor = "#dcd9d2"; (e.currentTarget as HTMLElement).style.color = "#1a1814"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "#8a8780"; }}
                      >
                        <Icon.pencil />
                      </button>
                      <button
                        onClick={() => { setDeletingId(item.id); setEditingId(null); setShowAddForm(false); }}
                        title="Delete"
                        style={{
                          width: 28, height: 28, borderRadius: 6,
                          border: "1px solid transparent",
                          background: "transparent",
                          color: "#8a8780",
                          cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 120ms",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#fbeee9"; (e.currentTarget as HTMLElement).style.borderColor = "#e7c9c0"; (e.currentTarget as HTMLElement).style.color = "#a8442f"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "#8a8780"; }}
                      >
                        <Icon.trash />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length > 0 && (
          <>
            <Divider />
            <div style={{ padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "#8a8780" }}>
                {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
                {search ? ` matching "${search}"` : ""}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
