// Handles data transformation for expense aggregation without React hooks
import { convertCurrency } from "@/utils/currencyConverter";

export interface BarData {
  label: string;
  date: Date;
  endDate?: Date;
  total: number;
  breakdown: { category: string; amount: number }[];
}

const PREDEFINED_CATEGORIES = ["Food", "Transport", "Rent", "Entertainment", "Utilities"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function aggregateDaily(expenses: any[], selectedYear: number, selectedMonth: number, walletCurrency: string): BarData[] {
  const data: BarData[] = [];
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(selectedYear, selectedMonth, i);
    const label = i.toString();
    data.push({ label, date: d, total: 0, breakdown: [] });
  }

  expenses.forEach((exp) => {
    const expDate = new Date(exp.date);
    if (expDate.getFullYear() === selectedYear && expDate.getMonth() === selectedMonth) {
      const amountInWallet = convertCurrency(exp.amount, exp.currency, walletCurrency);
      if (amountInWallet === null) return;
      const cat = exp.category || "Others";
      const targetIndex = expDate.getDate() - 1;
      
      if (data[targetIndex]) {
        data[targetIndex].total += amountInWallet;
        const bInd = data[targetIndex].breakdown.findIndex(b => b.category === cat);
        if (bInd !== -1) {
          data[targetIndex].breakdown[bInd].amount += amountInWallet;
        } else {
          data[targetIndex].breakdown.push({ category: cat, amount: amountInWallet });
        }
      }
    }
  });

  return data;
}

function aggregateWeekly(expenses: any[], selectedYear: number, selectedMonth: number, walletCurrency: string): BarData[] {
  const data: BarData[] = [];
  const firstDay = new Date(selectedYear, selectedMonth, 1);
  const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
  
  let current = new Date(firstDay);
  current.setDate(current.getDate() - current.getDay());

  let weekIdx = 1;
  while (current <= lastDay) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    if (weekEnd >= firstDay && weekStart <= lastDay) {
       data.push({ 
         label: `Week ${weekIdx}`, 
         date: weekStart, 
         endDate: weekEnd,
         total: 0, 
         breakdown: [] 
       });
       weekIdx++;
    }
    current.setDate(current.getDate() + 7);
  }

  expenses.forEach((exp) => {
    const expDate = new Date(exp.date);
    const targetIndex = data.findIndex(d => expDate >= d.date && expDate <= d.endDate!);
    
    if (targetIndex !== -1) {
      const amountInWallet = convertCurrency(exp.amount, exp.currency, walletCurrency);
      if (amountInWallet === null) return;
      const cat = exp.category || "Others";
      
      data[targetIndex].total += amountInWallet;
      const bInd = data[targetIndex].breakdown.findIndex(b => b.category === cat);
      if (bInd !== -1) {
        data[targetIndex].breakdown[bInd].amount += amountInWallet;
      } else {
        data[targetIndex].breakdown.push({ category: cat, amount: amountInWallet });
      }
    }
  });

  return data;
}

function aggregateMonthly(expenses: any[], selectedYear: number, walletCurrency: string): BarData[] {
  const data: BarData[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(selectedYear, i, 1);
    const label = MONTHS[i].slice(0, 3);
    data.push({ label, date: d, total: 0, breakdown: [] });
  }

  expenses.forEach((exp) => {
    const expDate = new Date(exp.date);
    if (expDate.getFullYear() === selectedYear) {
      const targetIndex = expDate.getMonth();
      const amountInWallet = convertCurrency(exp.amount, exp.currency, walletCurrency);
      if (amountInWallet === null) return;
      const cat = exp.category || "Others";
      
      if (data[targetIndex]) {
        data[targetIndex].total += amountInWallet;
        const bInd = data[targetIndex].breakdown.findIndex(b => b.category === cat);
        if (bInd !== -1) {
          data[targetIndex].breakdown[bInd].amount += amountInWallet;
        } else {
          data[targetIndex].breakdown.push({ category: cat, amount: amountInWallet });
        }
      }
    }
  });

  return data;
}

export function aggregateExpenses(
  expenses: any[],
  timeFrame: "Daily" | "Weekly" | "Monthly",
  selectedYear: number,
  selectedMonth: number,
  walletCurrency: string
): BarData[] {
  if (expenses.length === 0) return [];
  
  if (timeFrame === "Daily") {
    return aggregateDaily(expenses, selectedYear, selectedMonth, walletCurrency);
  } else if (timeFrame === "Weekly") {
    return aggregateWeekly(expenses, selectedYear, selectedMonth, walletCurrency);
  } else {
    return aggregateMonthly(expenses, selectedYear, walletCurrency);
  }
}
