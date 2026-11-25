// frontend/src/components/dashboard/NurserySellerInventoryWidget.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import { SmartLocationSelector } from '@/components/location/SmartLocationSelector';
import {
  fetchNurseryProducts,
  createNurseryProduct,
} from '@/lib/biointelApi';
import { NurseryProduct, NurseryProductCreate } from '@/types';
import {
  Store,
  PlusCircle,
  Package,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  X,
  Phone,
} from 'lucide-react';

export function NurserySellerInventoryWidget() {
  const [products, setProducts] = useState<NurseryProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newProduct, setNewProduct] = useState<NurseryProductCreate>({
    nursery_id: 'nursery_demo_01',
    crop_name: 'Tomato',
    variety_name: '',
    biotechnology_category: 'disease_resistant_varieties',
    description: '',
    price_per_unit: 1.25,
    pricing_unit: 'per_seedling',
    available_quantity: 15000,
    minimum_order_quantity: 500,
    certification_info: 'ICAR-IIHR Certified True-to-Type',
    availability_status: 'in_stock',
  });

  const loadSellerProducts = async () => {
    setIsLoading(true);
    try {
      const prods = await fetchNurseryProducts({});
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load seller products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSellerProducts();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createNurseryProduct(newProduct);
      setShowAddModal(false);
      loadSellerProducts();
    } catch (err) {
      console.error('Add product error:', err);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Nursery Seller Inventory Capability
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                Buyer Dashboard Module
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Manage certified biological inputs, seedlings stock, and wholesale nursery supplies
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-800 hover:bg-green-700 text-white font-semibold text-xs rounded-xl transition shadow-sm"
        >
          <PlusCircle className="w-4 h-4" /> Add New Inventory
        </button>
      </div>

      {isLoading ? (
        <div className="p-6 text-center text-xs text-zinc-400">Loading nursery stock items...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Variety / Product</th>
                <th className="p-3">Crop</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price / Unit</th>
                <th className="p-3">Available Stock</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {products.slice(0, 5).map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="p-3 font-semibold text-zinc-900 dark:text-white">
                    {p.variety_name}
                  </td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-300">{p.crop_name}</td>
                  <td className="p-3 text-zinc-500">{p.biotechnology_category}</td>
                  <td className="p-3 font-bold text-emerald-600">
                    {p.price_per_unit ? `₹${p.price_per_unit} / ${p.pricing_unit}` : 'Quote'}
                  </td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-300">
                    {p.available_quantity ? `${p.available_quantity.toLocaleString('en-IN')} units` : 'Inquire'}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {p.availability_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Buyer Delivery / Procurement Location Selector */}
      <div className="pt-2">
        <SmartLocationSelector
          role="buyer"
          compactMap={true}
          title="Buyer Procurement & Delivery Location"
          subtitle="Set your warehouse or delivery point for nursery dispatch and freight estimation."
          onConfirmLocation={() => {}}
        />
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Add Inventory Listing
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1 text-zinc-600 dark:text-zinc-400">Crop Name</label>
                <input
                  type="text"
                  required
                  value={newProduct.crop_name}
                  onChange={(e) => setNewProduct({ ...newProduct, crop_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-zinc-600 dark:text-zinc-400">Variety Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arka Rakshak F1"
                  value={newProduct.variety_name}
                  onChange={(e) => setNewProduct({ ...newProduct, variety_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-zinc-600 dark:text-zinc-400">Price (₹)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={newProduct.price_per_unit || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, price_per_unit: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-zinc-600 dark:text-zinc-400">Available Stock</label>
                  <input
                    type="number"
                    required
                    value={newProduct.available_quantity || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, available_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 text-zinc-600 dark:text-zinc-400">Description</label>
                <textarea
                  rows={2}
                  required
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-800 text-white font-semibold rounded-xl"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
