'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

interface Ingredient {
  id: number;
  name: string;
  price: string;
  quantityPerItem: string;
  totalPurchased: string;
  unit: string;
}

export default function Home() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: 1, name: '', price: '', quantityPerItem: '', totalPurchased: '', unit: 'meter' }
  ]);
  const [totalItems, setTotalItems] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [profitPercent, setProfitPercent] = useState<string>('');

  const addIngredient = () => {
    const newId = Math.max(...ingredients.map(i => i.id), 0) + 1;
    setIngredients([...ingredients, { id: newId, name: '', price: '', quantityPerItem: '', totalPurchased: '', unit: 'meter' }]);
  };

  const removeIngredient = (id: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ing => ing.id !== id));
    }
  };

  const updateIngredient = (id: number, field: keyof Ingredient, value: string) => {
    const updatedIngredients = ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    );
    setIngredients(updatedIngredients);
    
    // Auto-calculate total items based on ingredients
    const possibleItems = calculatePossibleItems(updatedIngredients);
    if (possibleItems > 0) {
      setTotalItems(possibleItems.toString());
    }
  };

  const calculatePossibleItems = (ings: Ingredient[]) => {
    const itemCounts = ings
      .filter(ing => ing.quantityPerItem && ing.totalPurchased)
      .map(ing => {
        const qtyPerItem = parseFloat(ing.quantityPerItem);
        const totalPurch = parseFloat(ing.totalPurchased);
        if (qtyPerItem > 0) {
          return Math.floor(totalPurch / qtyPerItem);
        }
        return Infinity;
      });
    
    if (itemCounts.length === 0) return 0;
    return Math.min(...itemCounts);
  };

  const handleProfitPercentChange = (value: string) => {
    setProfitPercent(value);
    const percent = parseFloat(value);
    if (!isNaN(percent) && percent >= 0) {
      const cost = calculateCostPerItem();
      const calculatedPrice = cost * (1 + percent / 100);
      setSellingPrice(calculatedPrice.toFixed(0));
    } else if (value === '') {
      setSellingPrice('');
    }
  };

  const handleSellingPriceChange = (value: string) => {
    setSellingPrice(value);
    const price = parseFloat(value);
    const cost = calculateCostPerItem();
    if (!isNaN(price) && cost > 0) {
      const calculatedPercent = ((price - cost) / cost) * 100;
      setProfitPercent(calculatedPercent.toFixed(1));
    } else if (value === '') {
      setProfitPercent('');
    }
  };

  const calculateCostPerItem = () => {
    return ingredients.reduce((total, ing) => {
      const price = parseFloat(ing.price) || 0;
      const quantityPerItem = parseFloat(ing.quantityPerItem) || 0;
      return total + (price * quantityPerItem);
    }, 0);
  };

  const costPerItem = calculateCostPerItem();
  const totalCost = costPerItem * (parseFloat(totalItems) || 0);
  const revenue = (parseFloat(sellingPrice) || 0) * (parseFloat(totalItems) || 0);
  const profit = revenue - totalCost;
  const profitMargin = revenue > 0 ? ((profit / revenue) * 100) : 0;

  const handleExportToExcel = () => {
    // Prepare summary data
    const summaryData = [
      ['KALKULATOR BIAYA PRODUKSI'],
      ['Tanggal Export:', new Date().toLocaleDateString('id-ID')],
      [''],
      ['RINGKASAN HASIL'],
      ['Total Item Diproduksi', totalItems || '0'],
      ['Keuntungan yang Diinginkan (%)', profitPercent || '0'],
      ['Harga Jual per Item', sellingPrice || '0'],
      ['Biaya per Item', costPerItem.toFixed(0)],
      ['Total Biaya', totalCost.toFixed(0)],
      ['Total Pendapatan', revenue.toFixed(0)],
      ['Keuntungan Bersih', profit.toFixed(0)],
      ['Persentase Keuntungan (%)', profitMargin.toFixed(1)],
      [''],
      ['DETAIL BAHAN BAKU'],
      ['Nama Bahan', 'Harga per Unit', 'Jumlah per Item', 'Total Pembelian', 'Satuan', 'Maks Item']
    ];

    // Prepare ingredients data
    const ingredientsData = ingredients.map(ing => [
      ing.name || '',
      ing.price || '0',
      ing.quantityPerItem || '0',
      ing.totalPurchased || '0',
      ing.unit || '',
      ing.quantityPerItem && ing.totalPurchased 
        ? Math.floor(parseFloat(ing.totalPurchased) / parseFloat(ing.quantityPerItem))
        : 0
    ]);

    // Combine all data
    const allData = [...summaryData, ...ingredientsData];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(allData);

    // Set column widths for better readability
    ws['!cols'] = [
      { width: 25 }, // Nama Bahan / Labels
      { width: 15 }, // Harga per Unit
      { width: 15 }, // Jumlah per Item
      { width: 15 }, // Total Pembelian
      { width: 10 }, // Satuan
      { width: 10 }  // Maks Item
    ];

    // Style the header rows
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = 0; R <= range.e.r; ++R) {
      for (let C = 0; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cell_address]) continue;
        
        // Style title row
        if (R === 0) {
          ws[cell_address].s = {
            font: { bold: true, size: 14 },
            alignment: { horizontal: 'center' }
          };
        }
        // Style section headers
        else if (R === 3 || R === 13) {
          ws[cell_address].s = {
            font: { bold: true, size: 12 },
            fill: { fgColor: { rgb: 'E0E0E0' } }
          };
        }
        // Style data headers
        else if (R === 14) {
          ws[cell_address].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'F0F0F0' } }
          };
        }
      }
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Kalkulator Produksi');

    // Generate filename with current date
    const filename = `kalkulator-biaya-produksi-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Write and download file
    XLSX.writeFile(wb, filename);
  };

  const handleExportToCSV = () => {
    // Create CSV content
    let csvContent = 'KALKULATOR BIAYA PRODUKSI\n';
    csvContent += `Tanggal Export,${new Date().toLocaleDateString('id-ID')}\n\n`;
    
    // Add summary section
    csvContent += 'RINGKASAN HASIL\n';
    csvContent += `Total Item Diproduksi,${totalItems || '0'}\n`;
    csvContent += `Keuntungan yang Diinginkan (%),${profitPercent || '0'}\n`;
    csvContent += `Harga Jual per Item,${sellingPrice || '0'}\n`;
    csvContent += `Biaya per Item,${costPerItem.toFixed(0)}\n`;
    csvContent += `Total Biaya,${totalCost.toFixed(0)}\n`;
    csvContent += `Total Pendapatan,${revenue.toFixed(0)}\n`;
    csvContent += `Keuntungan Bersih,${profit.toFixed(0)}\n`;
    csvContent += `Persentase Keuntungan (%),${profitMargin.toFixed(1)}\n\n`;
    
    // Add ingredients section
    csvContent += 'DETAIL BAHAN BAKU\n';
    csvContent += 'Nama Bahan,Harga per Unit,Jumlah per Item,Total Pembelian,Satuan,Maks Item\n';
    
    ingredients.forEach(ingredient => {
      const maxItems = ingredient.quantityPerItem && ingredient.totalPurchased 
        ? Math.floor(parseFloat(ingredient.totalPurchased) / parseFloat(ingredient.quantityPerItem))
        : 0;
      csvContent += `${ingredient.name || ''},${ingredient.price || '0'},${ingredient.quantityPerItem || '0'},${ingredient.totalPurchased || '0'},${ingredient.unit || ''},${maxItems}\n`;
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `kalkulator-biaya-produksi-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-end mb-4">
            <div className="flex gap-3">
              <button
                onClick={handleExportToExcel}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Excel
              </button>
              <button
                onClick={handleExportToCSV}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
            Kalkulator Biaya Produksi
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Hitung biaya dan keuntungan produksi
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 mb-6">
          {/* Ingredients Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Bahan Baku
              </h2>
              <button
                onClick={addIngredient}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105"
              >
                + Tambah Baris
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Masukkan total pembelian dan jumlah yang dibutuhkan per item. Sistem akan menghitung otomatis berapa item yang bisa diproduksi.
            </p>

            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header */}
                <div className="grid grid-cols-[200px_120px_120px_120px_100px_100px_50px] gap-3 mb-3 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Nama Bahan</div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Harga/Unit</div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Jml/Item</div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Total Beli</div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Satuan</div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide text-center">Maks</div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide"></div>
                </div>

                {/* Ingredient Rows */}
                <div className="space-y-2">
                  {ingredients.map((ingredient) => {
                    const qtyPerItem = parseFloat(ingredient.quantityPerItem) || 0;
                    const totalPurchased = parseFloat(ingredient.totalPurchased) || 0;
                    const possibleItems = qtyPerItem > 0 ? Math.floor(totalPurchased / qtyPerItem) : 0;
                    
                    return (
                      <div key={ingredient.id} className="grid grid-cols-[200px_120px_120px_120px_100px_100px_50px] gap-3 items-center bg-white dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
                        <input
                          type="text"
                          placeholder="Kain"
                          value={ingredient.name}
                          onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-sm"
                        />
                        <input
                          type="number"
                          placeholder="10000"
                          value={ingredient.price}
                          onChange={(e) => updateIngredient(ingredient.id, 'price', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-sm"
                        />
                        <input
                          type="number"
                          placeholder="3"
                          value={ingredient.quantityPerItem}
                          onChange={(e) => updateIngredient(ingredient.id, 'quantityPerItem', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-sm"
                        />
                        <input
                          type="number"
                          placeholder="6"
                          value={ingredient.totalPurchased}
                          onChange={(e) => updateIngredient(ingredient.id, 'totalPurchased', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-sm"
                        />
                        <select
                          value={ingredient.unit}
                          onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
                          className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-sm"
                        >
                          <option value="pcs">pcs</option>
                          <option value="meter">meter</option>
                          <option value="cm">cm</option>
                          <option value="kg">kg</option>
                          <option value="gram">gram</option>
                          <option value="liter">liter</option>
                          <option value="ml">ml</option>
                        </select>
                        <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 text-center px-2 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                          {possibleItems > 0 ? `${possibleItems}` : '-'}
                        </div>
                        <button
                          onClick={() => removeIngredient(ingredient.id)}
                          disabled={ingredients.length === 1}
                          className="text-red-500 hover:text-red-700 disabled:text-gray-300 dark:disabled:text-gray-600 transition-colors mx-auto"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Production & Pricing */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Total Item yang Diproduksi
                <span className="ml-2 text-xs font-normal text-indigo-600 dark:text-indigo-400">(Otomatis)</span>
              </label>
              <input
                type="number"
                value={totalItems}
                onChange={(e) => setTotalItems(e.target.value)}
                placeholder="Dihitung otomatis"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg font-medium bg-indigo-50 dark:bg-indigo-900/20"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Keuntungan yang Diinginkan %
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={profitPercent}
                  onChange={(e) => handleProfitPercentChange(e.target.value)}
                  placeholder="25"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg font-medium pr-10"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Harga Jual (Per Item)
              </label>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => handleSellingPriceChange(e.target.value)}
                placeholder="50000"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg font-medium"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Cost Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
              Ringkasan Biaya
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Biaya per item:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  Rp {costPerItem.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Total item:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {(parseFloat(totalItems) || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3 mt-4">
                <span className="font-bold text-gray-900 dark:text-white">Total Biaya:</span>
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  Rp {totalCost.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* Profit Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Ringkasan Keuntungan
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Keuntungan per item:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  Rp {((parseFloat(sellingPrice) || 0) - costPerItem).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Persentase keuntungan:</span>
                <span className={`font-bold ${parseFloat(profitPercent) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {profitPercent ? `${parseFloat(profitPercent).toFixed(1)}%` : '0%'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Total pendapatan:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  Rp {revenue.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 mt-4">
                <span className="font-bold text-gray-900 dark:text-white">Keuntungan Bersih:</span>
                <span className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  Rp {profit.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 dark:text-gray-400 text-sm">
          Dibuat untuk perencanaan produksi yang efisien
        </div>
      </div>
    </div>
  );
}
