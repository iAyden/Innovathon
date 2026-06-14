"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type ModuleType = "inventory" | "sales" | "orders" | "invoices" | "providers" | "cash-flow" | "integrations" | "reports" | "settings";

export interface Business {
  id: string;
  name: string;
  type: "comercio" | "servicios" | "b2b";
  activeModules: ModuleType[];
  settings: {
    paymentTerms?: string;
    notificationChannel?: string;
    [key: string]: any;
  };
}

interface BusinessContextType {
  businesses: Business[];
  activeBusiness: Business | null;
  setActiveBusinessId: (id: string | null) => void;
  addBusiness: (business: Business) => void;
  updateBusiness: (business: Business) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

// Negocio inicial simulado
const initialBusinesses: Business[] = [
  {
    id: "org-1",
    name: "Consultoría IT Principal",
    type: "b2b",
    activeModules: ["invoices", "providers", "cash-flow", "orders", "reports", "settings"],
    settings: {
      paymentTerms: "30-dias",
    }
  }
];

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);

  // Inicializar desde localStorage si existe, si no, usar los simulados
  useEffect(() => {
    const stored = localStorage.getItem("finflow_businesses");
    const storedActive = localStorage.getItem("finflow_active_business");
    
    if (stored) {
      const parsed = JSON.parse(stored);
      setBusinesses(parsed);
      if (storedActive && parsed.some((b: Business) => b.id === storedActive)) {
        setActiveBusinessId(storedActive);
      } else {
        setActiveBusinessId(null); // Null significa que estamos en el Hub Global
      }
    } else {
      setBusinesses(initialBusinesses);
      // Por defecto entramos al Hub Global (null)
      setActiveBusinessId(null);
      localStorage.setItem("finflow_businesses", JSON.stringify(initialBusinesses));
    }
  }, []);

  const addBusiness = (business: Business) => {
    const newBusinesses = [...businesses, business];
    setBusinesses(newBusinesses);
    localStorage.setItem("finflow_businesses", JSON.stringify(newBusinesses));
    
    // Al crear un negocio, saltamos automáticamente a él
    setActiveBusinessId(business.id);
    localStorage.setItem("finflow_active_business", business.id);
  };

  const updateBusiness = (updated: Business) => {
    const newBusinesses = businesses.map(b => b.id === updated.id ? updated : b);
    setBusinesses(newBusinesses);
    localStorage.setItem("finflow_businesses", JSON.stringify(newBusinesses));
  };

  const handleSetActiveBusiness = (id: string | null) => {
    setActiveBusinessId(id);
    if (id) {
      localStorage.setItem("finflow_active_business", id);
    } else {
      localStorage.removeItem("finflow_active_business");
    }
  };

  const activeBusiness = businesses.find(b => b.id === activeBusinessId) || null;

  return (
    <BusinessContext.Provider value={{ businesses, activeBusiness, setActiveBusinessId: handleSetActiveBusiness, addBusiness, updateBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
}
