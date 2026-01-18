
export interface DistrictData {
  state: string;
  district: string;
  ghost_risk_score: number;
  total_ghost_children: number;
  suspicious_pincodes: number;
}

export interface StateSummary {
  totalGhosts: number;
  avgRisk: number;
  count: number;
}

export interface AggregatedStats {
  totalGhosts: number;
  totalLeakage: number;
  totalDistricts: number;
  totalPincodes: number;
  filteredData: DistrictData[];
}
