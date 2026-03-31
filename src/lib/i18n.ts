export type Locale = "en" | "fil";

export const translations = {
  en: {
    // Common
    submit: "Upload",
    cancel: "Cancel",
    save: "Save",
    edit: "Edit",
    delete: "Delete",
    search: "Search",
    loading: "Loading...",
    back: "Back",
    today: "Today",
    date: "Date",
    notes: "Notes",
    total: "Total",
    status: "Status",

    // Auth
    enterPin: "Enter your PIN",
    pinPlaceholder: "4-digit PIN",
    login: "Login",
    logout: "Logout",
    wrongPin: "Wrong PIN. Try again.",

    // Staff Nav
    dailySales: "Daily Sales",
    inventory: "Inventory",
    production: "Production",
    receiving: "Receiving",

    // Daily Sales
    staffName: "Staff Name",
    cashSales: "Cash Sales",
    cardSales: "Card Sales (POS + Link + Visa + Transfer)",
    talabatSales: "Talabat Sales",
    expenses: "Expenses",
    expenseItem: "Expense Item",
    expenseAmount: "Amount",
    addExpense: "Add Expense",
    category: "Category",
    openingCash: "Opening Cash",
    closingCash: "Closing Cash",
    ptCash: "PT Cash Top-up (from Mohamed)",
    netSales: "Net Sales",
    notesHint: "Problems only — voids, refunds, missing cash",
    submitted: "Submitted successfully!",
    recentEntries: "Recent Entries",
    noEntries: "No entries yet",

    // Expense Categories
    catVegetables: "Vegetables",
    catBread: "Bread",
    catDrinks: "Drinks",
    catCleaning: "Cleaning",
    catOther: "Other",

    // Inventory
    grocery: "Grocery",
    packaging: "Packaging",
    kitchen: "Kitchen / Frozen",
    quantity: "Quantity",
    unit: "Unit",
    reorderAt: "Reorder At",
    updateCount: "Update Count",
    outOfStock: "OUT OF STOCK",
    lowStock: "LOW STOCK",
    ok: "OK",

    // Production
    item: "Item",
    madeBy: "Made By",
    logProduction: "Log Production",
  },
  fil: {
    // Common
    submit: "Upload",
    cancel: "Kanselahin",
    save: "I-save",
    edit: "I-edit",
    delete: "Burahin",
    search: "Hanapin",
    loading: "Naglo-load...",
    back: "Bumalik",
    today: "Ngayon",
    date: "Petsa",
    notes: "Mga Tala",
    total: "Kabuuan",
    status: "Katayuan",

    // Auth
    enterPin: "Ilagay ang iyong PIN",
    pinPlaceholder: "4-digit PIN",
    login: "Mag-login",
    logout: "Mag-logout",
    wrongPin: "Maling PIN. Subukan ulit.",

    // Staff Nav
    dailySales: "Benta ng Araw",
    inventory: "Imbentaryo",
    production: "Produksyon",
    receiving: "Pagtanggap",

    // Daily Sales
    staffName: "Pangalan ng Staff",
    cashSales: "Cash Sales",
    cardSales: "Card Sales (POS + Link + Visa + Transfer)",
    talabatSales: "Talabat Sales",
    expenses: "Mga Gastos",
    expenseItem: "Gastos",
    expenseAmount: "Halaga",
    addExpense: "Dagdagan ang Gastos",
    category: "Kategorya",
    openingCash: "Panimulang Cash",
    closingCash: "Panghuling Cash",
    ptCash: "PT Cash Top-up (mula kay Mohamed)",
    netSales: "Net Sales",
    notesHint: "Mga problema lang — void, refund, kulang na cash",
    submitted: "Matagumpay na naisumite!",
    recentEntries: "Mga Kamakailang Entry",
    noEntries: "Wala pang entry",

    // Expense Categories
    catVegetables: "Gulay",
    catBread: "Tinapay",
    catDrinks: "Inumin",
    catCleaning: "Panlinis",
    catOther: "Iba pa",

    // Inventory
    grocery: "Grocery",
    packaging: "Packaging",
    kitchen: "Kitchen / Frozen",
    quantity: "Dami",
    unit: "Yunit",
    reorderAt: "Mag-order sa",
    updateCount: "I-update ang Bilang",
    outOfStock: "UBOS NA",
    lowStock: "MABABA NA",
    ok: "OK",

    // Production
    item: "Bagay",
    madeBy: "Ginawa ni",
    logProduction: "I-log ang Produksyon",
  },
} as const;

export function t(locale: Locale, key: keyof typeof translations.en): string {
  return translations[locale][key] || translations.en[key];
}
