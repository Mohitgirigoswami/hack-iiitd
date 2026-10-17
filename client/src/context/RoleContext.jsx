import React, { createContext, useContext, useState } from 'react';

const RoleContext = createContext();

export const ROLES = {
  FARMER: {
    id: 'FARMER',
    name: 'Ramu Sharma',
    roleLabel: 'Marginal Farmer',
    village: 'Bhalaut (Najafgarh border)',
    khetPin: 'HR-ROH-78G4',
    phone: '+91 98123 45099',
    crop: 'Mustard (सरसों)',
    declaredQuantity: 4.0, // 4 Quintals = 8 bags
    badgeColor: 'emerald',
    iconName: 'Sprout',
  },
  DRIVER: {
    id: 'DRIVER',
    name: 'Baljit Singh',
    roleLabel: 'Corridor Transporter',
    vehicle: 'Mahindra Bolero Pickup (1.5T)',
    regNumber: 'HR-12-AE-8419',
    phone: '+91 94160 88219',
    route: 'Rohtak ➔ Bhalaut ➔ Kalanaur ➔ Azadpur APMC',
    badgeColor: 'blue',
    iconName: 'Truck',
  },
  BUYER: {
    id: 'BUYER',
    name: 'Shree Ram Flour & Oil Mill',
    roleLabel: 'Institutional Processor',
    location: 'Lawrence Road Industrial Area, Delhi',
    gstin: '07AAAAA0000A1Z5',
    phone: '+91 98111 22334',
    badgeColor: 'amber',
    iconName: 'Building2',
  },
  ADMIN: {
    id: 'ADMIN',
    name: 'Dr. Vivek Swaminathan',
    roleLabel: 'APMC Corridor Director',
    mandi: 'Azadpur APMC Mandi, Delhi',
    region: 'North India Agri-Logistics Grid',
    phone: '+91 11 2769 1100',
    badgeColor: 'zinc',
    iconName: 'BarChart3',
  },
};

export function RoleProvider({ children }) {
  const [currentRoleId, setCurrentRoleId] = useState(() => {
    return localStorage.getItem('khetos_role') || 'ADMIN';
  });
  const [customPhone, setCustomPhone] = useState(() => {
    return localStorage.getItem('khetos_phone') || '+91 98123 45099';
  });

  const activeRole = ROLES[currentRoleId] || ROLES.ADMIN;

  const setRole = (roleId) => {
    if (ROLES[roleId]) {
      setCurrentRoleId(roleId);
      localStorage.setItem('khetos_role', roleId);
    }
  };

  const updatePhone = (phone) => {
    setCustomPhone(phone);
    localStorage.setItem('khetos_phone', phone);
  };

  return (
    <RoleContext.Provider value={{ currentRoleId, activeRole, setRole, ROLES, customPhone, setCustomPhone: updatePhone }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
