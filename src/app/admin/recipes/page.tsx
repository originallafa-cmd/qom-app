"use client";

import { useState, useEffect } from "react";

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  ingredientCount: number;
}

interface RecipeIngredient {
  id: string;
  qty_used: number;
  unit: string;
  type: string;
  inventory_item: { name: string; unit: string; type: string };
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  type: string;
}

export default function AdminRecipes() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [recipe, setRecipe] = useState<RecipeIngredient[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add ingredient form
  const [addInvId, setAddInvId] = useState("");
  const [addQty, setAddQty] = useState("");
  const [addUnit, setAddUnit] = useState("pcs");
  const [addType, setAddType] = useState("ingredient");

  useEffect(() => {
    Promise.all([
      fetch("/api/recipes").then(r => r.json()),
      fetch("/api/inventory").then(r => r.json()),
    ]).then(([items, inv]) => {
      setMenuItems(Array.isArray(items) ? items : []);
      setInventory(Array.isArray(inv) ? inv : []);
    }).finally(() => setLoading(false));
  }, []);

  async function selectItem(item: MenuItem) {
    setSelectedItem(item);
    const res = await fetch(`/api/recipes?menuItemId=${item.id}`);
    const data = await res.json();
    setRecipe(Array.isArray(data) ? data : []);
  }

  async function addIngredient() {
    if (!selectedItem || !addInvId || !addQty) return;
    await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menuItemId: selectedItem.id,
        inventoryItemId: addInvId,
        qtyUsed: parseFloat(addQty),
        unit: addUnit,
        type: addType,
      }),
    });
    setAddInvId("");
    setAddQty("");
    selectItem(selectedItem);
    // Refresh counts
    const res = await fetch("/api/recipes");
    setMenuItems(await res.json());
  }

  async function removeIngredient(id: string) {
    if (!confirm("Remove this ingredient?")) return;
    await fetch("/api/recipes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (selectedItem) selectItem(selectedItem);
    const res = await fetch("/api/recipes");
    setMenuItems(await res.json());
  }

  const filtered = menuItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const grouped: Record<string, MenuItem[]> = {};
  filtered.forEach(i => {
    if (!grouped[i.category]) grouped[i.category] = [];
    grouped[i.category].push(i);
  });

  if (loading) return <div className="flex items-center justify-center h-96"><p className="text-admin-text2">Loading...</p></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-admin-text font-[family-name:var(--font-cairo)]">
          Recipe Map
        </h1>
        <p className="text-sm text-admin-text3">
          Map menu items to inventory ingredients & packaging. {menuItems.length} items, {menuItems.filter(i => i.ingredientCount > 0).length} mapped.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Menu Items */}
        <div className="space-y-3">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search menu items..."
            className="w-full px-4 py-2 rounded-lg bg-admin-card border border-admin-border text-admin-text text-sm"
          />

          <div className="bg-admin-card rounded-xl border border-admin-border overflow-hidden max-h-[70vh] overflow-y-auto">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <div className="px-4 py-2 bg-admin-bg text-xs font-semibold text-admin-text3 sticky top-0">
                  {cat} ({items.length})
                </div>
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => selectItem(item)}
                    className={`w-full px-4 py-2.5 flex items-center justify-between text-left border-b border-admin-border/30 hover:bg-admin-card-hover transition-colors ${
                      selectedItem?.id === item.id ? "bg-teal/10 border-l-2 border-l-teal" : ""
                    }`}
                  >
                    <div>
                      <span className="text-sm text-admin-text">{item.name}</span>
                      <span className="text-xs text-admin-text3 ml-2">{item.price} AED</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      item.ingredientCount > 0 ? "bg-success/10 text-success" : "bg-admin-bg text-admin-text3"
                    }`}>
                      {item.ingredientCount > 0 ? `${item.ingredientCount} items` : "No recipe"}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recipe Details */}
        <div>
          {!selectedItem ? (
            <div className="bg-admin-card rounded-xl border border-admin-border p-8 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-admin-text2">Select a menu item to view/edit its recipe</p>
            </div>
          ) : (
            <div className="bg-admin-card rounded-xl border border-admin-border p-5 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-admin-text">{selectedItem.name}</h3>
                <p className="text-xs text-admin-text3">{selectedItem.category} — {selectedItem.price} AED</p>
              </div>

              {/* Current recipe */}
              {recipe.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-admin-text2">Ingredients & Packaging:</p>
                  {recipe.map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-admin-bg rounded-lg px-3 py-2">
                      <div>
                        <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${
                          r.type === "packaging" ? "bg-info/10 text-info" : "bg-gold/10 text-gold"
                        }`}>
                          {r.type === "packaging" ? "PKG" : "ING"}
                        </span>
                        <span className="text-sm text-admin-text">{r.inventory_item?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-admin-text font-medium">{r.qty_used} {r.unit}</span>
                        <button onClick={() => removeIngredient(r.id)} className="text-xs text-danger hover:underline">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-admin-text3">No recipe defined yet. Add ingredients below.</p>
              )}

              {/* Add ingredient */}
              <div className="border-t border-admin-border pt-4 space-y-3">
                <p className="text-xs font-semibold text-admin-text2">Add ingredient / packaging:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] text-admin-text3 mb-1">Inventory Item</label>
                    <select value={addInvId} onChange={e => setAddInvId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm">
                      <option value="">Select item...</option>
                      {["grocery", "packaging", "kitchen"].map(type => (
                        <optgroup key={type} label={type.toUpperCase()}>
                          {inventory.filter(i => i.type === type).map(i => (
                            <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-admin-text3 mb-1">Qty Used</label>
                    <input type="number" step="0.001" value={addQty} onChange={e => setAddQty(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-admin-text3 mb-1">Type</label>
                    <select value={addType} onChange={e => setAddType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm">
                      <option value="ingredient">Ingredient</option>
                      <option value="packaging">Packaging</option>
                    </select>
                  </div>
                </div>
                <button onClick={addIngredient} disabled={!addInvId || !addQty}
                  className="w-full py-2 rounded-lg bg-teal text-white text-sm font-medium disabled:opacity-40">
                  Add to Recipe
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
