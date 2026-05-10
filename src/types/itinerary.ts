export type ActivityPlan = {
  time: string;
  text: string;
};

export type PackItem = {
  text: string;
  checked: boolean;
};

export type ItineraryDay = {
  plans: ActivityPlan[];
  packing: PackItem[];
  notes: string;
  collapsed: boolean;
};

export type ItineraryDocument = {
  v: 1;
  tripId: number;
  title: string;
  startDate: string;
  endDate: string;
  about: string;
  days: ItineraryDay[];
};
