export const API_URL = process.env.API_URL || 'https://api.practicesoftwaretesting.com';

export type Account = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type Address = {
  country: string; // ISO code, as the country dropdown uses it
  postcode: string;
  houseNumber: string;
};

// The shop fills street, city and state itself from these three fields (postcode lookup),
// and the API rejects an order whose address does not match that lookup. So tests only
// ever type these three and let the shop do the rest.
export const billingAddress: Address = {
  country: 'IN',
  postcode: '641001',
  houseNumber: '12',
};

export const products = {
  pliers: 'Pliers',
  slipJointPliers: 'Slip Joint Pliers',
  hammer: 'Hammer',
};

let counter = 0;

/** A throwaway shopper. Unique per call so parallel workers never fight over an account. */
export function newShopper(): Account & { dob: string; phone: string } {
  counter += 1;
  const id = `${Date.now()}${process.pid}${counter}`;
  return {
    firstName: 'Suite',
    lastName: 'Runner',
    email: `suite.runner.${id}@example.com`,
    // Needs upper, lower, digit and symbol. Random tail keeps it off any breached-password list.
    password: `Tq7#${Math.random().toString(36).slice(2, 10)}-Vx9!`,
    dob: '1990-04-12',
    phone: '9876543210',
  };
}

export const usd = (amount: number) => `$${amount.toFixed(2)}`;

export const toNumber = (text: string) => Number(text.replace(/[^0-9.]/g, ''));

export const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
